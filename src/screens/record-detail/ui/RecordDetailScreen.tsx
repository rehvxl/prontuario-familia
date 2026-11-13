import { useState } from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMember } from '@/entities/member';
import {
  RECORD_TYPE_APPEARANCE,
  recordTypeLabel,
  useRecord,
  type Attachment,
  type HealthRecord,
} from '@/entities/health-record';
import { computeFlag, formatMeasurementValue, seriesKey, spokenUnit, type Measurement } from '@/entities/measurement';
import { medicationStatus, type Medication } from '@/entities/medication';
import { vaccineLabel, type VaccineDose } from '@/entities/vaccine';
import { useDeleteRecord } from '@/features/delete-record';
import { useRecordLinkedItems } from '@/features/health-overview';
import { AttachmentViewer } from '@/widgets/attachment-viewer';
import { TOOLBAR_ICONS, useBoardStatusBar } from '@/shared/ui/navigation';
import { formatShortDate, toLocalIsoDate } from '@/shared/lib';
import {
  Badge,
  Banner,
  ConfirmSheet,
  EmptyState,
  IconTile,
  ListItem,
  ListSection,
  LoadErrorState,
  MetricValue,
  Screen,
  SectionHeader,
  SkeletonListItem,
  Spinner,
  Text,
  categoricalIndexFor,
  errorMessage,
  formatDate,
  headerOptions,
  metricAccessibilityLabel,
  useTheme,
} from '@/shared/ui';

const A1 = 'A faixa de referência é a impressa no laudo. Só o profissional de saúde pode interpretar o resultado.';
/** A15, com o singular quando há um item só. */
const a15 = (n: number) =>
  n === 1
    ? 'Este documento tem 1 item de saúde ligado a ele. Ele também será apagado.'
    : `Este documento tem ${n} itens de saúde ligados a ele. Eles também serão apagados.`;

const sizeLabel = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

function MeasurementItem({ m, onPress }: { m: Measurement; onPress(): void }) {
  const value = formatMeasurementValue(m);
  const value2 = m.value2 === null ? undefined : formatMeasurementValue({ ...m, value: m.value2 });
  const unitSpoken = spokenUnit(m.unit, value2 === undefined ? m.value : undefined);
  // S3: sinal vital nunca recebe estado de faixa.
  const state = m.kind === 'lab' ? computeFlag(m.value, m.referenceLow, m.referenceHigh) : undefined;
  const reference = m.referenceText ? `Faixa do laudo: ${m.referenceText}` : undefined;
  const metric = metricAccessibilityLabel({ value, value2, unit: m.unit, unitSpoken, state });
  return (
    <ListItem
      title={m.label}
      subtitle={reference}
      value={<MetricValue value={value} value2={value2} unit={m.unit} unitSpoken={unitSpoken} state={state} size="compact" showStateLabel={state !== undefined} />}
      onPress={onPress}
      chevron
      accessibilityLabel={[m.label, metric, reference].filter(Boolean).join(', ')}
      accessibilityHint={m.kind === 'lab' ? 'Abre a tendência deste exame' : 'Abre os sinais vitais'}
      testID={`linked-${m.id}`}
    />
  );
}

function DoseItem({ d, onPress }: { d: VaccineDose; onPress(): void }) {
  const name = vaccineLabel(d.vaccineCode, d.vaccineName);
  const detail = [d.doseLabel, d.appliedOn ? formatShortDate(d.appliedOn) : 'Data não informada', d.lot ? `Lote ${d.lot}` : null].filter(Boolean).join(' · ');
  return (
    <ListItem
      leading={<IconTile icon="shot" background="clinicalInSoft" color="onClinicalInSoft" />}
      title={name}
      subtitle={detail}
      onPress={onPress}
      chevron
      accessibilityHint="Abre a carteira de vacinas"
      testID={`linked-${d.id}`}
    />
  );
}

function MedicationItem({ m, today, onPress }: { m: Medication; today: string; onPress(): void }) {
  const status = medicationStatus(m, today);
  const plan =
    status === 'scheduled'
      ? `Começa em ${formatShortDate(m.startOn)}`
      : status === 'ended'
        ? `Encerrado em ${formatShortDate(m.endOn ?? m.startOn)}`
        : m.endOn === null
          ? 'Uso contínuo'
          : `Até ${formatShortDate(m.endOn)}`;
  return (
    <ListItem
      leading={<IconTile icon="pills" background={status === 'active' ? 'primarySoft' : 'surfaceSunken'} color={status === 'active' ? 'onPrimarySoft' : 'textSecondary'} />}
      title={[m.name, m.dosage].filter(Boolean).join(' ')}
      subtitle={[m.instructions, plan].filter(Boolean).join(' · ')}
      onPress={onPress}
      chevron
      accessibilityHint="Abre os medicamentos"
      testID={`linked-${m.id}`}
    />
  );
}

/** Detalhe de um registro: itens de saúde ligados, dados, anexos e exclusão com confirmação (A15). */
export function RecordDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recordId = typeof id === 'string' ? id : undefined;
  const record = useRecord(recordId);
  const member = useMember(record.data?.memberId);
  const linked = useRecordLinkedItems(recordId ?? '');
  const remove = useDeleteRecord();
  const [confirming, setConfirming] = useState(false);
  const [opened, setOpened] = useState<Attachment | null>(null);
  // v4: o registro fica na divisória da pessoa dona dele (sem pessoa ainda carregada, a tela simples).
  const hue = record.data ? theme.personBoard(categoricalIndexFor(record.data.memberId)) : undefined;
  useBoardStatusBar(hue?.statusBar ?? null);

  // Depois de apagar, não mostre "não encontrado" enquanto a tela fecha.
  if (remove.isPending || remove.isSuccess) return <Screen scroll={false} board={hue}><Spinner fill label="Excluindo" /></Screen>;
  if (record.isPending) return <Screen scroll={false} board={hue}><Spinner fill label="Carregando" /></Screen>;
  if (record.isError) return <Screen scroll={false} board={hue}><LoadErrorState onRetry={() => void record.refetch()} /></Screen>;
  if (!record.data) {
    return (
      <Screen scroll={false} board={hue}>
        <EmptyState icon="file" title="Registro não encontrado" message="Ele pode ter sido excluído." action={{ label: 'Voltar', onPress: () => router.back() }} />
      </Screen>
    );
  }
  const r: HealthRecord = record.data;
  const { colorIndex, icon } = RECORD_TYPE_APPEARANCE[r.type];
  const items = linked.data;
  const count = items?.count ?? 0;
  const today = toLocalIsoDate();
  const memberId = r.memberId;
  const openSeries = (m: Measurement) =>
    m.kind === 'lab'
      ? router.push({ pathname: '/(main)/member/[id]/exams/[series]', params: { id: memberId, series: seriesKey(m) } })
      : router.push({ pathname: '/(main)/member/[id]/vitals/[code]', params: { id: memberId, code: m.code } });

  return (
    <Screen testID="record-detail-screen" board={hue}>
      <Stack.Screen options={{ ...headerOptions(theme, { board: hue }), title: 'Registro' }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon={TOOLBAR_ICONS.more} title="Mais ações" accessibilityLabel="Mais ações">
          <Stack.Toolbar.MenuAction icon="trash" destructive onPress={() => setConfirming(true)}>
            Excluir registro
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      {remove.error ? <Banner tone="danger" message={errorMessage(remove.error, 'Não foi possível excluir. Nada foi apagado.')} style={{ marginBottom: theme.space[4] }} /> : null}

      <View style={{ gap: theme.space[2], alignItems: 'flex-start', marginTop: theme.space[2] }}>
        <Badge label={recordTypeLabel(r.type)} colorIndex={colorIndex} icon={icon} />
        <Text variant="title1" color="link">
          {r.title}
        </Text>
        <Text variant="subheadline" color="secondary">
          {[member.data?.fullName, formatDate(r.date, 'long')].filter(Boolean).join(' · ')}
        </Text>
      </View>

      {linked.isError ? (
        <View testID="linked-error">
          <SectionHeader title="Itens deste documento" />
          <LoadErrorState onRetry={() => void linked.refetch()} />
        </View>
      ) : !items ? (
        <View accessibilityLabel="Carregando" testID="linked-loading">
          <SectionHeader title="Itens deste documento" />
          <SkeletonListItem />
        </View>
      ) : count > 0 ? (
        <View testID="linked-items">
          <ListSection header="Itens deste documento" separatorInset="none" style={{ marginTop: theme.layout.sectionHeaderTop }}>
            {[
              ...items.measurements.map((m) => <MeasurementItem key={m.id} m={m} onPress={() => openSeries(m)} />),
              ...items.vaccineDoses.map((d) => (
                <DoseItem key={d.id} d={d} onPress={() => router.push({ pathname: '/(main)/member/[id]/vaccines', params: { id: memberId } })} />
              )),
              ...items.medications.map((m) => (
                <MedicationItem key={m.id} m={m} today={today} onPress={() => router.push({ pathname: '/(main)/member/[id]/medications', params: { id: memberId } })} />
              )),
            ]}
          </ListSection>
          {items.measurements.some((m) => m.kind === 'lab') ? (
            <Text variant="footnote" color="secondary" style={{ marginTop: theme.space[2] }}>
              {A1}
            </Text>
          ) : null}
        </View>
      ) : null}

      <ListSection header="Dados" style={{ marginTop: theme.layout.sectionHeaderTop }} separatorInset="none">
        <ListItem title="Local" subtitle={r.location || 'Não informado'} testID="detail-location" />
        <ListItem title="Profissional" subtitle={r.professional || 'Não informado'} testID="detail-professional" />
      </ListSection>

      <ListSection header="Anexos" footer="Só quem é da família vê estes arquivos." style={{ marginTop: theme.layout.sectionHeaderTop }}>
        {r.attachments.length === 0 ? (
          <ListItem leading={<IconTile icon="attach" />} title="Nenhum arquivo anexado" subtitle="Os anexos deste registro aparecem aqui." />
        ) : (
          r.attachments.map((a) => {
            const kind = a.mimeType === 'application/pdf' ? 'PDF' : 'Imagem';
            return (
              <ListItem
                key={a.id}
                leading={<IconTile icon={kind === 'PDF' ? 'fileText' : 'gallery'} />}
                title={a.fileName}
                subtitle={`${kind} · ${sizeLabel(a.sizeBytes)}`}
                onPress={() => setOpened(a)}
                chevron
                accessibilityLabel={`${a.fileName}, ${kind}, ${sizeLabel(a.sizeBytes)}`}
                accessibilityHint="Abre o arquivo em tela cheia"
                testID={`attachment-${a.id}`}
              />
            );
          })
        )}
      </ListSection>

      <ListSection header="Observações" style={{ marginTop: theme.layout.sectionHeaderTop }} separatorInset="none">
        <ListItem title={r.notes || 'Nenhuma observação'} testID="detail-notes" />
      </ListSection>

      <AttachmentViewer attachment={opened} onClose={() => setOpened(null)} />
      <ConfirmSheet
        visible={confirming}
        destructive
        title="Excluir este registro?"
        message={count > 0 ? a15(count) : 'O registro e os arquivos anexados serão apagados. Não dá para desfazer.'}
        confirmLabel="Excluir registro"
        loading={remove.isPending || (!items && !linked.isError)}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          remove.mutate(r.id, {
            onSuccess: () => router.back(),
            onSettled: () => setConfirming(false),
          })
        }
      />
    </Screen>
  );
}
