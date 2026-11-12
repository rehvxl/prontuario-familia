import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Stack, useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { TOOLBAR_ICONS } from '@/shared/ui/navigation';
import { StatusBar } from 'expo-status-bar';
import { useMemberTimeline, type HealthRecord } from '@/entities/health-record';
import { useMember } from '@/entities/member';
import { MedicationRow, medicationRowTexts, medicationStatus, useMemberMedications, type Medication, type MedicationStatus } from '@/entities/medication';
import { MEDICATION_FOOTNOTE, useDeleteMedication, useEndMedication } from '@/features/manage-medication';
import { formatShortDate, toLocalIsoDate } from '@/shared/lib';
import {
  Banner,
  BottomSheet,
  Button,
  ConfirmSheet,
  DateField,
  EmptyState,
  ListItem,
  ListSection,
  ListSkeleton,
  LoadErrorState,
  Screen,
  SectionHeader,
  Text,
  categoricalIndexFor,
  errorMessage,
  headerOptions,
  useTheme,
} from '@/shared/ui';

/** S5: origem pronta para a linha. Registro ainda carregando ou fora da lista → frase genérica. */
function originText(m: Medication, records: ReadonlyMap<string, HealthRecord>): string {
  if (!m.sourceRecordId) return 'Registrado por você';
  const record = records.get(m.sourceRecordId);
  return record ? `Do documento ${record.title}, ${formatShortDate(record.date)}` : 'Do documento de origem';
}

/** R5 → seções. Em uso: início mais recente primeiro; começa em breve: o mais próximo primeiro; anteriores: fim mais recente primeiro. */
function groupByStatus(items: readonly Medication[], today: string): Record<MedicationStatus, Medication[]> {
  const groups: Record<MedicationStatus, Medication[]> = { active: [], scheduled: [], ended: [] };
  for (const m of items) groups[medicationStatus(m, today)].push(m);
  groups.active.sort((a, b) => b.startOn.localeCompare(a.startOn));
  groups.scheduled.sort((a, b) => a.startOn.localeCompare(b.startOn));
  groups.ended.sort((a, b) => (b.endOn ?? '').localeCompare(a.endOn ?? ''));
  return groups;
}

/** Medicamentos da pessoa (spec F4): Em uso, Começa em breve e Anteriores (recolhida), detalhe com encerrar e excluir, A5. */
export function MemberMedicationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memberId = typeof id === 'string' ? id : '';
  const member = useMember(memberId || undefined);
  const medications = useMemberMedications(memberId);
  // Só para a origem (S5); se falhar, a lista continua com a frase genérica.
  const timeline = useMemberTimeline(member.data?.familyId, memberId || undefined);
  const today = toLocalIsoDate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showEnded, setShowEnded] = useState(false);
  // v4: a tela fica na divisória da pessoa (cabeçalho opaco na cor dela; o título vai na folha).
  const hue = theme.personBoard(categoricalIndexFor(memberId));
  const focused = useIsFocused();

  const records = useMemo(() => new Map((timeline.data ?? []).flatMap((g) => g.records).map((r) => [r.id, r] as const)), [timeline.data]);
  const groups = useMemo(() => groupByStatus(medications.data ?? [], today), [medications.data, today]);
  const selected = medications.data?.find((m) => m.id === selectedId) ?? null;

  const add = () => router.push({ pathname: '/(main)/medication/new', params: { memberId } });
  const addPrescription = () => router.push({ pathname: '/(main)/record/new', params: { memberId } });

  const row = (m: Medication, status: MedicationStatus) => (
    <MedicationRow
      key={m.id}
      name={m.name}
      dosage={m.dosage}
      instructions={m.instructions}
      startOn={m.startOn}
      endOn={m.endOn}
      status={status}
      origin={originText(m, records)}
      onPress={() => setSelectedId(m.id)}
      testID={`medication-${m.id}`}
    />
  );

  let content;
  if (medications.isPending) content = <ListSkeleton count={3} />;
  else if (medications.isError) content = <LoadErrorState onRetry={() => void medications.refetch()} />;
  else if (medications.data.length === 0) {
    content = (
      <EmptyState
        icon="pills"
        title="Nenhum medicamento registrado."
        message="Guarde uma receita ou adicione manualmente."
        action={{ label: 'Adicionar medicamento', onPress: add }}
        secondaryAction={{ label: 'Guardar receita', onPress: addPrescription }}
      />
    );
  } else {
    const onlyEnded = groups.active.length === 0 && groups.scheduled.length === 0;
    const endedOpen = showEnded || onlyEnded;
    const n = groups.ended.length;
    const sections: { title: string; status: MedicationStatus; items: Medication[] }[] = [
      { title: 'Em uso', status: 'active', items: groups.active },
      { title: 'Começa em breve', status: 'scheduled', items: groups.scheduled },
    ];
    content = (
      <>
        {sections
          .filter((s) => s.items.length > 0)
          .map((s, i) => (
            <View key={s.status}>
              <SectionHeader title={s.title} style={i === 0 ? { marginTop: theme.space[2] } : undefined} />
              <ListSection>{s.items.map((m) => row(m, s.status))}</ListSection>
            </View>
          ))}
        {n > 0 ? (
          <View>
            <SectionHeader
              title="Anteriores"
              style={onlyEnded ? { marginTop: theme.space[2] } : undefined}
              action={
                onlyEnded
                  ? undefined
                  : { label: endedOpen ? 'Ocultar anteriores' : `Mostrar ${n} ${n === 1 ? 'anterior' : 'anteriores'}`, onPress: () => setShowEnded((v) => !v) }
              }
            />
            {endedOpen ? <ListSection>{groups.ended.map((m) => row(m, 'ended'))}</ListSection> : null}
          </View>
        ) : null}
      </>
    );
  }

  return (
    <Screen testID="member-medications-screen" board={hue} heading={{ title: 'Medicamentos', subtitle: member.data?.fullName }}>
      <Stack.Screen options={headerOptions(theme, { board: hue, contentTitle: true })} />
      {focused ? <StatusBar style={hue.statusBar} /> : null}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon={TOOLBAR_ICONS.add} accessibilityLabel="Adicionar medicamento" onPress={add} />
      </Stack.Toolbar>
      {content}
      <Text variant="footnote" color="secondary" style={{ marginTop: theme.space[6] }} testID="medication-footnote">
        {MEDICATION_FOOTNOTE}
      </Text>
      <MedicationDetailSheet
        medication={selected}
        today={today}
        origin={selected ? originText(selected, records) : ''}
        onClose={() => setSelectedId(null)}
        onEnded={() => {
          setSelectedId(null);
          setShowEnded(true);
        }}
        onOpenRecord={(recordId) => {
          setSelectedId(null);
          router.push({ pathname: '/(main)/record/[id]', params: { id: recordId } });
        }}
      />
    </Screen>
  );
}

interface DetailProps {
  medication: Medication | null;
  today: string;
  origin: string;
  onClose(): void;
  onEnded(): void;
  onOpenRecord(recordId: string): void;
}

/**
 * Detalhe (padrão da F2.9, decisão L8): dados, origem, "Encerrar uso" com data (padrão hoje, F4.4) e
 * excluir pela `ConfirmSheet`. A folha de data e a confirmação abrem por cima desta (folha sobre folha).
 */
function MedicationDetailSheet({ medication, today, origin, onClose, onEnded, onOpenRecord }: DetailProps) {
  const theme = useTheme();
  const end = useEndMedication();
  const remove = useDeleteMedication();
  const [ending, setEnding] = useState(false);
  const [endOn, setEndOn] = useState<string | null>(today);
  const [confirming, setConfirming] = useState(false);

  const close = () => {
    if (end.isPending || remove.isPending) return;
    setEnding(false);
    setConfirming(false);
    setEndOn(today);
    end.reset();
    remove.reset();
    onClose();
  };

  if (!medication) return <BottomSheet visible={false} onClose={onClose} />;
  const status = medicationStatus(medication, today);
  const { title, subtitle, state } = medicationRowTexts({ ...medication, status });

  const confirmEnd = () =>
    end.mutate(
      { medication, endOn: endOn ?? '' },
      {
        onSuccess: () => {
          setEnding(false);
          setEndOn(today);
          end.reset();
          onEnded();
        },
      },
    );

  return (
    <BottomSheet visible onClose={close} title={ending ? 'Encerrar uso' : title} message={ending ? title : subtitle || undefined} testID="medication-detail">
      {ending ? (
        <View style={{ gap: theme.space[4] }}>
          <DateField
            label="Data de término"
            value={endOn}
            onChange={(d) => {
              setEndOn(d);
              end.reset();
            }}
            error={end.error ? errorMessage(end.error, 'Não foi possível encerrar. Tente de novo.') : null}
            testID="medication-end-date"
          />
          <Button label="Encerrar uso" onPress={confirmEnd} loading={end.isPending} fullWidth testID="confirm-end-medication" />
          <Button
            label="Cancelar"
            variant="secondary"
            onPress={() => {
              setEnding(false);
              end.reset();
            }}
            disabled={end.isPending}
            fullWidth
          />
        </View>
      ) : (
        <View style={{ gap: theme.space[4] }}>
          <ListSection>
            <ListItem title="Início" subtitle={formatShortDate(medication.startOn)} />
            <ListItem title="Término" subtitle={medication.endOn ? formatShortDate(medication.endOn) : 'Uso contínuo'} />
            <ListItem title="Situação" subtitle={state ?? 'Em uso'} />
            <ListItem title="Origem" subtitle={origin} />
          </ListSection>
          {remove.error ? <Banner tone="danger" message={errorMessage(remove.error, 'Não foi possível excluir. Nada foi apagado.')} testID="delete-medication-error" /> : null}
          {medication.sourceRecordId ? (
            <Button label="Ver documento" variant="secondary" onPress={() => onOpenRecord(medication.sourceRecordId!)} fullWidth />
          ) : null}
          {status === 'active' ? <Button label="Encerrar uso" onPress={() => setEnding(true)} fullWidth testID="end-medication" /> : null}
          <Button label="Excluir medicamento" variant="ghost" role="destructive" onPress={() => setConfirming(true)} fullWidth testID="delete-medication" />
        </View>
      )}
      <ConfirmSheet
        visible={confirming}
        destructive
        title="Excluir este medicamento?"
        message="Ele sai da lista de medicamentos. Não dá para desfazer."
        confirmLabel="Excluir medicamento"
        loading={remove.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          remove.mutate(medication, {
            onSuccess: () => {
              setConfirming(false);
              remove.reset();
              onClose();
            },
            onError: () => setConfirming(false),
          })
        }
      />
    </BottomSheet>
  );
}
