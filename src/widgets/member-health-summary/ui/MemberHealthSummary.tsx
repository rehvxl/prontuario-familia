import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatDecimal, formatShortDate } from '@/shared/lib';
import {
  Icon,
  ListSection,
  ListSkeleton,
  MetricValue,
  RangeBar,
  SectionHeader,
  Sparkline,
  StateChip,
  Text,
  metricAccessibilityLabel,
  useStackedLayout,
  useTheme,
  type IconName,
} from '@/shared/ui';
import {
  VITALS,
  computeFlag,
  formatMeasurementValue,
  spokenUnit,
  useMemberMeasurements,
  vitalSeries,
  type Measurement,
  type MeasurementSeries,
  type VitalCode,
} from '@/entities/measurement';
import { useMemberMedications, type Medication } from '@/entities/medication';
import type { Member } from '@/entities/member';
import { doseLabelOf, useMemberVaccines, vaccineLabel, type RuleEvaluation, type VaccineStatus } from '@/entities/vaccine';
import { useMemberHealthSummary, type SectionState } from '@/features/health-overview';

/** Destino de um toque no Resumo. A tela traduz para rota; o widget não conhece o router. */
export type SummaryTarget =
  | { screen: 'exams' }
  | { screen: 'exam-series'; seriesKey: string }
  | { screen: 'vaccines' }
  | { screen: 'medications' }
  | { screen: 'vitals'; code: VitalCode }
  | { screen: 'new-measurement' }
  | { screen: 'new-vaccine-dose' }
  | { screen: 'new-medication' }
  | { screen: 'new-vital' }
  | { screen: 'edit-member' };

export interface MemberHealthSummaryProps {
  member: Member;
  onOpen(target: SummaryTarget): void;
}

// Avisos da spec §3.3 (texto exato).
const A1 = 'A faixa de referência é a impressa no laudo. Só o profissional de saúde pode interpretar o resultado.';
const A3 = 'Referência do calendário público. Confirme com o profissional de saúde.';
const A5 = 'Lista para consulta. Não mude o tratamento sem falar com o profissional de saúde.';
const A13 = 'As pendências consideram só as doses registradas no app.';
const a4 = (firstName: string) => `O app não avalia estes valores. Mostre a sequência ao profissional que acompanha ${firstName}.`;
const a12 = (firstName: string) => `Adicione a data de nascimento de ${firstName} para ver as vacinas do calendário.`;

/** Rótulos da R9 a R12 (spec §5 e F3.1); mesma tabela do painel da família (`health-overview`), que não a exporta. */
const STATUS_LABEL: Partial<Record<VaccineStatus, string>> = {
  late: 'Atrasada pelo calendário',
  due: 'Pendente',
  confirm: 'Confirmar na carteira',
  next: 'Próxima',
};

const VITAL_ICON: Record<VitalCode, IconName> = { bp: 'bloodPressure', glucose_capillary: 'glucose', weight: 'weight', height: 'height' };
const CONTEXT_LABEL = { fasting: 'em jejum', post_meal: 'após refeição', other: 'outro momento' } as const;
/** Pontos na sparkline da pressão: as últimas medições, para a linha caber em 132 pt. */
const SPARK_POINTS = 10;

const firstNameOf = (member: Member) => member.fullName.trim().split(/\s+/)[0] ?? member.fullName;
const lower = (s: string) => s.toLocaleLowerCase('pt-BR');

/** "dT (reforço), atrasada pelo calendário" / "SCR (1ª dose), próxima, a partir de 10 de jan. de 2027" (F3.9). */
function describePending(e: RuleEvaluation): string {
  const dose = e.rule.doseLabel ?? doseLabelOf(e.rule.doseKey);
  const status = STATUS_LABEL[e.status];
  const from = e.status === 'next' && e.dueFrom ? `, a partir de ${formatShortDate(e.dueFrom)}` : '';
  return `${vaccineLabel(e.rule.vaccineCode)} (${lower(dose)})${status ? `, ${lower(status)}` : ''}${from}`;
}

/** Faixa impressa no laudo em texto: "70–99 mg/dL", "até 5,6 %", "a partir de 40 mg/dL" ou o texto do laudo. */
function rangeText(m: Measurement): string | null {
  const unit = m.unit ? ` ${m.unit}` : '';
  if (m.referenceLow !== null && m.referenceHigh !== null) return `${formatDecimal(m.referenceLow)}–${formatDecimal(m.referenceHigh)}${unit}`;
  if (m.referenceHigh !== null) return `até ${formatDecimal(m.referenceHigh)}${unit}`;
  if (m.referenceLow !== null) return `a partir de ${formatDecimal(m.referenceLow)}${unit}`;
  return m.referenceText ? `“${m.referenceText}” (texto do laudo)` : null;
}

const when = (m: Measurement) => `${formatShortDate(m.takenOn)}${m.takenAt ? `, ${m.takenAt}` : ''}`;

/**
 * Resumo de saúde da pessoa (spec F6): Vacinas → Exames recentes → Medicamentos em uso → Sinais vitais, cada seção
 * com o próprio estado (carregando, erro com "Tentar de novo", vazio com a ação) e "Ver tudo".
 * A origem (S5, "Do documento …") fica na série do exame, na lista de medicamentos e no detalhe: o Resumo é a
 * leitura rápida, como no protótipo v3.
 */
export function MemberHealthSummary({ member, onOpen }: MemberHealthSummaryProps) {
  const theme = useTheme();
  const firstName = firstNameOf(member);
  const { summary, sections } = useMemberHealthSummary(member.id);
  // Mesmas chaves que o resumo já usa: só lê o cache para saber o que existe fora da janela do Resumo.
  const measurements = useMemberMeasurements(member.id);
  const vaccines = useMemberVaccines(member.id);
  const medications = useMemberMedications(member.id);

  const labs = (measurements.data ?? []).filter((m) => m.kind === 'lab');
  const allEmpty =
    measurements.isSuccess && vaccines.isSuccess && medications.isSuccess &&
    measurements.data.length === 0 && vaccines.data.doses.length === 0 && medications.data.length === 0;
  const vitalCodes = VITALS.map((v) => v.code).filter((code) => summary?.vitals[code]);

  return (
    <View testID="member-health-summary">
      {allEmpty ? (
        <Text variant="body" color="secondary" style={{ marginTop: theme.space[5] }} testID="summary-all-empty">
          {`Ainda não há dados de saúde de ${firstName}. Guarde um documento para começar.`}
        </Text>
      ) : null}

      <Section
        title="Vacinas"
        onSeeAll={() => onOpen({ screen: 'vaccines' })}
        state={sections.vaccines}
        ready={!!summary}
        errorText="Não foi possível carregar as vacinas."
        footer={summary && !summary.vaccines.missingBirthDate ? `${A3} ${A13}` : A3}
        testID="summary-vaccines"
      >
        {summary?.vaccines.missingBirthDate ? (
          <>
            <Row icon="shot" title={a12(firstName)} />
            <ActionRow label="Adicionar data de nascimento" onPress={() => onOpen({ screen: 'edit-member' })} />
          </>
        ) : summary ? (
          <Row
            // Estado pelo ícone + texto, na tinta da pessoa: relógio para atrasada, calendário para pendente.
            icon={summary.vaccines.upToDate ? 'stateIn' : summary.vaccines.first?.status === 'late' ? 'clock' : 'calendar'}
            title={
              summary.vaccines.upToDate
                ? 'Em dia com o calendário'
                : `${summary.vaccines.pendingCount} ${summary.vaccines.pendingCount === 1 ? 'pendência' : 'pendências'}`
            }
            lines={summary.vaccines.first ? [describePending(summary.vaccines.first)] : []}
            onPress={() => onOpen({ screen: 'vaccines' })}
            testID="summary-vaccines-status"
          />
        ) : null}
        {vaccines.data && vaccines.data.doses.length === 0 ? (
          <ActionRow label="Registrar dose" onPress={() => onOpen({ screen: 'new-vaccine-dose' })} />
        ) : null}
      </Section>

      <Section
        title="Exames recentes"
        onSeeAll={() => onOpen({ screen: 'exams' })}
        state={sections.labs}
        ready={!!summary}
        errorText="Não foi possível carregar os exames."
        footer={A1}
        testID="summary-labs"
      >
        {summary && summary.recentLabs.length > 0 ? (
          summary.recentLabs.map((s) => (
            <ExamRow key={s.key} series={s} onPress={() => onOpen({ screen: 'exam-series', seriesKey: s.key })} />
          ))
        ) : (
          <>
            <EmptyRow text={labs.length > 0 ? 'Nenhum resultado nos últimos 12 meses.' : 'Nenhum exame registrado.'} />
            <ActionRow label="Adicionar resultado" onPress={() => onOpen({ screen: 'new-measurement' })} />
          </>
        )}
      </Section>

      <Section
        title="Medicamentos em uso"
        onSeeAll={() => onOpen({ screen: 'medications' })}
        state={sections.medications}
        ready={!!summary}
        errorText="Não foi possível carregar os medicamentos."
        footer={A5}
        testID="summary-medications"
      >
        {summary && summary.activeMedications.length > 0 ? (
          summary.activeMedications.map((m) => (
            <MedicationLine key={m.id} medication={m} onPress={() => onOpen({ screen: 'medications' })} />
          ))
        ) : (
          <>
            <EmptyRow text={(medications.data?.length ?? 0) > 0 ? 'Nenhum medicamento em uso.' : 'Nenhum medicamento registrado.'} />
            <ActionRow label="Adicionar medicamento" onPress={() => onOpen({ screen: 'new-medication' })} />
          </>
        )}
      </Section>

      <Section
        title="Sinais vitais"
        onSeeAll={() => onOpen({ screen: 'vitals', code: vitalCodes[0] ?? 'bp' })}
        state={sections.vitals}
        ready={!!summary}
        errorText="Não foi possível carregar os sinais vitais."
        footer={a4(firstName)}
        testID="summary-vitals"
      >
        {summary && vitalCodes.length > 0 ? (
          vitalCodes.map((code) => (
            <VitalLine
              key={code}
              measurement={summary.vitals[code]!}
              history={code === 'bp' ? vitalSeries(measurements.data ?? [], 'bp').slice(-SPARK_POINTS) : []}
              onPress={() => onOpen({ screen: 'vitals', code })}
            />
          ))
        ) : (
          <>
            <EmptyRow text="Nenhuma medição registrada." />
            <ActionRow label="Registrar sinal vital" onPress={() => onOpen({ screen: 'new-vital' })} />
          </>
        )}
      </Section>
    </View>
  );
}

// ---- seções e linhas ------------------------------------------------------------------------------------------

interface SectionProps {
  title: string;
  onSeeAll(): void;
  state: SectionState;
  /** O resumo depende da pessoa; sem ele a seção ainda está carregando. */
  ready: boolean;
  errorText: string;
  footer: string;
  children: ReactNode;
  testID: string;
}

function Section({ title, onSeeAll, state, ready, errorText, footer, children, testID }: SectionProps) {
  const body = state.error ? (
    <>
      <EmptyRow text={errorText} />
      <ActionRow label="Tentar de novo" icon="refresh" onPress={state.retry} />
    </>
  ) : state.isLoading || !ready ? (
    <ListSkeleton count={2} />
  ) : (
    children
  );
  return (
    <View testID={testID}>
      <SectionHeader title={title} action={{ label: 'Ver tudo', onPress: onSeeAll, accessibilityHint: `Abre ${lower(title)}` }} />
      <ListSection footer={footer}>
        {body}
      </ListSection>
    </View>
  );
}

/** Linha da folha (v4), tocável ou só leitura: ícone na tinta da pessoa, título e linhas de apoio de 13 pt. */
function Row({
  icon,
  title,
  lines = [],
  accessory,
  accessibilityLabel,
  onPress,
  testID,
}: {
  icon: IconName;
  title: string;
  lines?: string[];
  accessory?: ReactNode;
  accessibilityLabel?: string;
  onPress?: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const label = accessibilityLabel ?? [title, ...lines].join('. ');
  const content = (
    <>
      <View style={styles.icon}>
        <Icon name={icon} size={20} weight="semibold" color="primary" />
      </View>
      <View style={[styles.grow, { gap: 2 }]}>
        <Text variant="headline">{title}</Text>
        {lines.map((line) => (
          <Text key={line} variant="footnote" color="secondary">
            {line}
          </Text>
        ))}
        {accessory}
      </View>
      {onPress && process.env.EXPO_OS === 'ios' ? <Icon name="forward" size={15} weight="semibold" color="textTertiary" /> : null}
    </>
  );
  const style = [styles.row, styles.top, { minHeight: theme.layout.rowMinHeight, paddingVertical: theme.space[3], gap: theme.space[3] }];
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label} style={style} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: theme.colors.border }}
      style={({ pressed }) => [style, pressed && process.env.EXPO_OS !== 'android' && { backgroundColor: theme.colors.surfaceSunken }]}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

function EmptyRow({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={{ paddingTop: theme.space[3], paddingBottom: theme.space[3] }}>
      <Text variant="subheadline" color="secondary">
        {text}
      </Text>
    </View>
  );
}

/** Ação de texto na folha ("Adicionar resultado"): verbo + objeto na tinta da pessoa, alvo de 52 pt. */
function ActionRow({ label, icon = 'add', onPress }: { label: string; icon?: IconName; onPress(): void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: theme.colors.border }}
      style={({ pressed }) => [
        styles.row,
        { minHeight: theme.layout.rowMinHeight, paddingVertical: theme.space[3], gap: theme.space[3] },
        pressed && process.env.EXPO_OS !== 'android' && { backgroundColor: theme.colors.surfaceSunken },
      ]}
    >
      <Icon name={icon} size={20} color="primary" />
      <Text variant="body" color="link" style={styles.grow}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Último resultado de uma série: valor contra a régua do laudo, estado em texto, faixa e data. */
function ExamRow({ series, onPress }: { series: MeasurementSeries; onPress(): void }) {
  const theme = useTheme();
  const stacked = useStackedLayout();
  const m = series.latest;
  const state = computeFlag(m.value, m.referenceLow, m.referenceHigh);
  const value = formatMeasurementValue(m);
  const unitSpoken = spokenUnit(m.unit, m.value);
  const range = rangeText(m);
  const meta = [range ? `Faixa do laudo: ${range}` : null, formatShortDate(m.takenOn)].filter(Boolean).join(' · ');
  const metric = metricAccessibilityLabel({ value, unit: m.unit, unitSpoken, state });
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[`${series.label}, ${metric}`, meta].filter(Boolean).join('. ')}
      android_ripple={{ color: theme.colors.border }}
      style={({ pressed }) => [
        { paddingVertical: 14, gap: theme.space[2] },
        pressed && process.env.EXPO_OS !== 'android' && { backgroundColor: theme.colors.surfaceSunken },
      ]}
      testID={`summary-lab-${series.key}`}
    >
      <View style={[stacked ? null : styles.spread, { gap: theme.space[2] }]}>
        <Text variant="headline" style={stacked ? undefined : styles.grow}>
          {series.label}
        </Text>
        <MetricValue value={value} unit={m.unit} unitSpoken={unitSpoken} state={state} />
      </View>
      <View style={[stacked ? { gap: theme.space[2] } : styles.spread, !stacked && { gap: theme.space[3] }]}>
        <StateChip state={state} />
        <RangeBar
          value={m.value}
          range={{ low: m.referenceLow ?? undefined, high: m.referenceHigh ?? undefined, text: m.referenceText ?? undefined }}
          state={state}
          width={stacked ? 'fill' : 112}
        />
      </View>
      <Text variant="footnote" color="secondary">
        {meta}
      </Text>
    </Pressable>
  );
}

function MedicationLine({ medication: m, onPress }: { medication: Medication; onPress(): void }) {
  const plan = m.endOn === null ? 'uso contínuo' : `até ${formatShortDate(m.endOn)}`;
  const detail = [m.instructions, plan].filter(Boolean).join(' · ');
  return (
    <Row
      icon="pills"
      title={[m.name, m.dosage].filter(Boolean).join(' ')}
      lines={detail ? [detail] : []}
      onPress={onPress}
      testID={`summary-medication-${m.id}`}
    />
  );
}

/** Último sinal vital, sem faixa nem estado (S3). A pressão leva a sparkline das últimas medições. */
function VitalLine({ measurement: m, history, onPress }: { measurement: Measurement; history: Measurement[]; onPress(): void }) {
  const theme = useTheme();
  const stacked = useStackedLayout();
  const code = m.code as VitalCode;
  const vital = VITALS.find((v) => v.code === code);
  const title = [vital?.label ?? m.label, m.context ? CONTEXT_LABEL[m.context] : null].filter(Boolean).join(' · ');
  const value = formatMeasurementValue(m);
  const value2 = m.value2 !== null ? formatMeasurementValue({ ...m, value: m.value2 }) : undefined;
  // Pressão (dois números) fica no plural; o singular só vale para um único valor 1.
  const unitSpoken = spokenUnit(m.unit, value2 === undefined ? m.value : undefined);
  const spoken = metricAccessibilityLabel({ value, value2, unit: m.unit, unitSpoken });
  const spark =
    history.length >= 2 ? (
      <Sparkline
        series={[history.map((h) => h.value), history.map((h) => h.value2 ?? h.value)]}
        summary={`${history.length} medições, de ${formatShortDate(history[0]!.takenOn)} a ${formatShortDate(history.at(-1)!.takenOn)}. Última: ${value}/${value2 ?? ''}`}
        style={{ marginTop: theme.space[2] }}
        testID="summary-bp-sparkline"
      />
    ) : null;
  return (
    <Row
      icon={VITAL_ICON[code] ?? 'trend'}
      title={title}
      accessibilityLabel={`${title}, ${spoken}. ${when(m)}`}
      accessory={
        <View style={stacked ? undefined : [styles.spread, { gap: theme.space[3] }]}>
          <View style={{ gap: 2 }}>
            <MetricValue value={value} value2={value2} unit={m.unit} unitSpoken={unitSpoken} />
            <Text variant="footnote" color="secondary" tabular>
              {when(m)}
            </Text>
          </View>
          {spark}
        </View>
      }
      onPress={onPress}
      testID={`summary-vital-${code}`}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  // Linhas com texto de apoio: o ícone acompanha a primeira linha, não o centro do bloco (Dynamic Type).
  top: { alignItems: 'flex-start' },
  icon: { marginTop: 1 },
  grow: { flex: 1, flexShrink: 1 },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
});
