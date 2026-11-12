import type { ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Stack, useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { TOOLBAR_ICONS } from '@/shared/ui/navigation';
import { StatusBar } from 'expo-status-bar';
import { useMember } from '@/entities/member';
import { VITALS, formatMeasurementValue, spokenUnit, useMemberMeasurements, vitalSeries, type Measurement, type MeasurementContext, type VitalCode } from '@/entities/measurement';
import { formatShortDate } from '@/shared/lib';
import {
  EmptyState,
  ListItem,
  ListSection,
  ListSkeleton,
  LoadErrorState,
  MetricValue,
  Screen,
  SectionHeader,
  Sparkline,
  Text,
  categoricalIndexFor,
  headerOptions,
  metricAccessibilityLabel,
  type IconName,
  useTheme,
} from '@/shared/ui';

// shortcut: rótulos e A4 repetem os do VitalEntryForm porque o ui/index.ts da feature só exporta o formulário; mover para a API pública se outro slice precisar.
const CONTEXT_LABELS: Record<MeasurementContext, string> = { fasting: 'Em jejum', post_meal: 'Após refeição', other: 'Outro momento' };
const ICONS: Record<VitalCode, IconName> = { bp: 'bloodPressure', glucose_capillary: 'glucose', weight: 'weight', height: 'height' };
const CHART_HEIGHT = 96;

const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] ?? fullName;
/** A4 (spec §3.3). */
const vitalsFootnote = (fullName: string) => `O app não avalia estes valores. Mostre a sequência ao profissional que acompanha ${firstName(fullName)}.`;
/** '08:12' → '8h12'. */
const spokenTime = (hhmm: string) => `${Number(hhmm.slice(0, 2))}h${hhmm.slice(3, 5)}`;
const value2Text = (m: Measurement) => (m.value2 !== null ? formatMeasurementValue({ ...m, value: m.value2 }) : undefined);
const valueText = (m: Measurement) => [formatMeasurementValue(m), value2Text(m)].filter(Boolean).join('/');
const whenText = (m: Measurement) => [formatShortDate(m.takenOn), m.takenAt ? spokenTime(m.takenAt) : null].filter(Boolean).join(', ');
/** Vitais são lançados à mão (S5). */
const originText = (m: Measurement) => (m.origin === 'manual' ? 'Registrado por você' : 'Lido de um documento');
const detailText = (m: Measurement) => [m.context ? CONTEXT_LABELS[m.context] : null, originText(m)].filter(Boolean).join(' · ');

/** Resumo do gráfico, visível e lido como descrição da imagem. */
function vitalsChartSummary(label: string, points: Measurement[]): string {
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const period = first.takenOn === last.takenOn ? `em ${formatShortDate(first.takenOn)}` : `de ${formatShortDate(first.takenOn)} a ${formatShortDate(last.takenOn)}`;
  const name = last.code === 'bp' ? `${label}, sistólica e diastólica` : label;
  return `${name}: ${points.length} medições ${period}. Última: ${valueText(last)} ${last.unit}.`;
}

/** Série de um sinal vital da pessoa (spec F5.4–F5.5; rota member/[id]/vitals/[code]). Sem faixa e sem IMC (S3). */
export function MemberVitalsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id, code } = useLocalSearchParams<{ id: string; code: string }>();
  const memberId = typeof id === 'string' ? id : '';
  const vital = VITALS.find((v) => v.code === code);
  const member = useMember(memberId || undefined);
  const measurements = useMemberMeasurements(memberId);
  // v4: a tela fica na divisória da pessoa; a série segue a tinta dela.
  const hue = theme.personBoard(categoricalIndexFor(memberId));
  const focused = useIsFocused();

  const addVital = () => router.push({ pathname: '/(main)/vital/new', params: { memberId, kind: vital?.code ?? '' } });
  const toolbar = (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button icon={TOOLBAR_ICONS.add} accessibilityLabel="Registrar sinal vital" onPress={addVital} />
    </Stack.Toolbar>
  );
  const page = (heading: { title: string; subtitle?: string }, children: ReactNode) => (
    <Screen testID="member-vitals-screen" board={hue} heading={heading}>
      <Stack.Screen options={headerOptions(theme, { board: hue, contentTitle: true })} />
      {focused ? <StatusBar style={hue.statusBar} /> : null}
      {children}
    </Screen>
  );

  if (!vital) {
    return page(
      { title: 'Sinais vitais' },
      <EmptyState icon="pulse" title="Sinal vital não encontrado" message="Volte e escolha pressão, glicemia capilar, peso ou altura." action={{ label: 'Voltar', onPress: () => router.back() }} />,
    );
  }

  const heading = { title: vital.label, subtitle: member.data?.fullName };
  if (measurements.isPending || member.isPending) {
    return page(
      heading,
      <>
        {toolbar}
        <ListSkeleton count={3} />
      </>,
    );
  }
  if (measurements.isError || member.isError || !member.data) {
    return page(
      heading,
      <>
        {toolbar}
        <LoadErrorState
          message="Não foi possível carregar as medições."
          onRetry={() => {
            void member.refetch();
            void measurements.refetch();
          }}
        />
      </>,
    );
  }

  const points = vitalSeries(measurements.data, vital.code);
  const footnote = vitalsFootnote(member.data.fullName);

  if (points.length === 0) {
    return page(
      heading,
      <>
        {toolbar}
        <EmptyState icon={ICONS[vital.code]} title="Nenhuma medição registrada." action={{ label: 'Registrar sinal vital', onPress: addVital }} />
        <Text variant="footnote" color="secondary" style={{ marginTop: theme.space[6] }}>
          {footnote}
        </Text>
      </>,
    );
  }

  const latest = points[points.length - 1]!;
  const newestFirst = [...points].reverse();
  const summary = points.length >= 2 ? vitalsChartSummary(vital.label, points) : null;
  // Largura da coluna da folha: tela menos a margem dos furos e o respiro à direita (sem régua nesta tela).
  const chartWidth = Math.max(120, Math.min(width - theme.layout.leafMargin - theme.layout.leafGutter, theme.layout.maxContentWidth));
  // Singular só para um valor único 1 ("1 quilograma"); a pressão (dois números) fica no plural.
  const metricProps = (m: Measurement) => ({ value: formatMeasurementValue(m), value2: value2Text(m), unit: m.unit, unitSpoken: spokenUnit(m.unit, m.value2 === null ? m.value : undefined) });
  const metric = (m: Measurement, size: 'row' | 'compact') => <MetricValue {...metricProps(m)} size={size} />;

  return page(
    heading,
    <>
      {toolbar}
      {/* Na folha, sem cartões: seção com cabeçalho e o valor logo abaixo. */}
      <SectionHeader title="Última medição" style={{ marginTop: theme.space[2] }} />
      <View style={{ gap: theme.space[1] }} testID="vitals-latest">
        {metric(latest, 'row')}
        <Text variant="subheadline" color="secondary" tabular>
          {whenText(latest)}
        </Text>
        <Text variant="footnote" color="secondary">
          {detailText(latest)}
        </Text>
      </View>

      {summary ? (
        <View>
          <SectionHeader title="Evolução" />
          <Sparkline
            series={vital.code === 'bp' ? [points.map((m) => m.value), points.map((m) => m.value2 ?? m.value)] : [points.map((m) => m.value)]}
            width={chartWidth}
            height={CHART_HEIGHT}
            summary={summary}
            testID="vitals-chart"
          />
          {vital.code === 'bp' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[4], marginTop: theme.space[3] }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {(['Sistólica', 'Diastólica'] as const).map((label, k) => (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
                  <View style={{ width: 16, height: 2, borderRadius: 1, backgroundColor: hue.ink, opacity: k === 0 ? 1 : 0.5 }} />
                  <Text variant="footnote" color="secondary">
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          {/* O resumo já é o rótulo da imagem: o texto visível não é lido de novo. */}
          <Text variant="subheadline" style={{ marginTop: theme.space[3] }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {summary}
          </Text>
        </View>
      ) : null}

      <ListSection header="Medições" footer={footnote} style={{ marginTop: theme.layout.sectionGap }} testID="vitals-list">
        {newestFirst.map((m) => (
          <ListItem
            key={m.id}
            title={whenText(m)}
            subtitle={detailText(m)}
            value={metric(m, 'compact')}
            accessibilityLabel={`${whenText(m)}, ${metricAccessibilityLabel(metricProps(m))}, ${detailText(m)}`}
            testID={`vital-row-${m.id}`}
          />
        ))}
      </ListSection>
    </>,
  );
}
