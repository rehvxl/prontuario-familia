import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Stack, useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMyFamily } from '@/entities/family';
import { useMemberTimeline, type HealthRecord } from '@/entities/health-record';
import { useMember } from '@/entities/member';
import {
  LAB_REFERENCE_NOTICE,
  buildSeries,
  computeFlag,
  measurementOriginText,
  formatMeasurementValue,
  measurementValueText,
  referenceRangeText,
  spokenUnit,
  useMemberMeasurements,
  type Measurement,
  type MeasurementSeries,
} from '@/entities/measurement';
import { useDeleteMeasurement } from '@/features/add-measurement';
import { formatAxisDate, formatMonthYear, formatShortDate } from '@/shared/lib';
import {
  ActionSheet,
  Banner,
  ConfirmSheet,
  EmptyState,
  ListSection,
  ListSkeleton,
  MetricValue,
  REFERENCE_STATE_APPEARANCE,
  RangeBar,
  Screen,
  SectionHeader,
  Spinner,
  StateLine,
  TREND_SINGLE_POINT_TEXT,
  Text,
  TrendChart,
  categoricalIndexFor,
  errorMessage,
  headerOptions,
  metricAccessibilityLabel,
  useTheme,
  type TrendPoint,
} from '@/shared/ui';

/** R3: texto da linha cujo resultado está em outra unidade. */
const OFF_CHART = 'Unidade diferente, fora do gráfico';

const flagOf = (m: Measurement) => computeFlag(m.value, m.referenceLow, m.referenceHigh);
const spokenFlag = (m: Measurement) => REFERENCE_STATE_APPEARANCE[flagOf(m)].long.toLocaleLowerCase('pt-BR');

/** F2.7: "{Exame}: {n} resultados de {mês/ano} a {mês/ano}. Último: {valor} {unidade}, {estado}." */
function trendSummary(s: MeasurementSeries): string {
  const first = s.chart[0]!;
  const last = s.chart[s.chart.length - 1]!;
  return `${s.label}: ${s.chart.length} resultados de ${formatMonthYear(first.takenOn)} a ${formatMonthYear(last.takenOn)}. Último: ${measurementValueText(last)}, ${spokenFlag(last)}.`;
}

function trendPoints(s: MeasurementSeries): TrendPoint[] {
  // R4: a banda vem do domínio (todos os pontos com o mesmo piso e teto); sem ela, a faixa fica por linha.
  const range = s.band ? { low: s.band.low, high: s.band.high } : undefined;
  return s.chart.map((m) => ({ date: m.takenOn, label: formatAxisDate(m.takenOn), value: m.value, valueText: formatMeasurementValue(m), state: flagOf(m), range }));
}

/** Tendência de uma série de exame (spec F2.2–F2.10; rota member/[id]/exams/[series]). */
export function ExamSeriesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; series: string }>();
  const memberId = typeof params.id === 'string' ? params.id : '';
  const key = typeof params.series === 'string' ? params.series : '';
  const member = useMember(memberId || undefined);
  const familyId = useMyFamily().data?.id;
  const measurements = useMemberMeasurements(memberId);
  const timeline = useMemberTimeline(familyId, memberId || undefined);
  const remove = useDeleteMeasurement();
  const [selected, setSelected] = useState<Measurement | null>(null);
  const [deleting, setDeleting] = useState<Measurement | null>(null);
  // v4: a tela fica na divisória da pessoa; o gráfico e a faixa do laudo seguem a tinta dela.
  const hue = theme.personBoard(categoricalIndexFor(memberId));
  const focused = useIsFocused();
  const page = (children: ReactNode, scroll = true) => (
    <Screen testID={scroll ? 'exam-series-screen' : undefined} board={hue} scroll={scroll}>
      <Stack.Screen options={headerOptions(theme, { board: hue, contentTitle: true })} />
      {focused ? <StatusBar style={hue.statusBar} /> : null}
      {children}
    </Screen>
  );

  const series = useMemo(() => buildSeries(measurements.data ?? []).find((s) => s.key === key), [measurements.data, key]);
  const records = useMemo(() => new Map((timeline.data ?? []).flatMap((g) => g.records).map((r) => [r.id, r])), [timeline.data]);
  const recordOf = (m: Measurement): HealthRecord | undefined => (m.sourceRecordId ? records.get(m.sourceRecordId) : undefined);
  const originOf = (m: Measurement) => measurementOriginText(m, recordOf(m));

  const addResult = () => router.push({ pathname: '/(main)/measurement/new', params: { memberId } });
  const openDocument = (recordId: string) => router.push({ pathname: '/(main)/record/[id]', params: { id: recordId } });
  const edit = (m: Measurement) => router.push({ pathname: '/(main)/measurement/new', params: { memberId, measurementId: m.id } });

  const footer = (
    <Text variant="footnote" color="secondary" style={{ marginTop: theme.space[6] }}>
      {LAB_REFERENCE_NOTICE}
    </Text>
  );

  if (measurements.isError || member.isError) {
    return page(
      <>
        <EmptyState
          tone="error"
          title="Não foi possível carregar os exames."
          action={{ label: 'Tentar de novo', icon: 'refresh-outline', onPress: () => void Promise.all([measurements.refetch(), member.refetch()]) }}
        />
        {footer}
      </>,
    );
  }
  if (measurements.isPending) {
    return page(
      <>
        <ListSkeleton count={3} />
        {footer}
      </>,
    );
  }
  if (!series) {
    // O último resultado acabou de ser excluído: a tela já está voltando.
    if (remove.isSuccess) return page(<Spinner fill label="Excluindo" />, false);
    return page(
      <>
        <EmptyState icon="flask" title="Exame não encontrado" message="Os resultados podem ter sido excluídos." action={{ label: 'Voltar', onPress: () => router.back() }} />
        {footer}
      </>,
    );
  }

  const latest = series.latest;
  const latestState = flagOf(latest);
  const latestRange = referenceRangeText(latest);
  const latestRecord = recordOf(latest);
  const newestFirst = [...series.points].reverse();
  const offChart = new Set(series.offChart.map((m) => m.id));

  return page(
    <>
      <View style={{ gap: theme.space[1], marginBottom: theme.space[2] }}>
        <Text variant="title1" color="link">
          {series.label}
        </Text>
        {member.data ? (
          <Text variant="subheadline" color="secondary">
            {member.data.fullName}
          </Text>
        ) : null}
      </View>

      {remove.error ? <Banner tone="danger" message={errorMessage(remove.error, 'Não foi possível excluir. Nada foi apagado.')} style={{ marginTop: theme.space[4] }} /> : null}

      {/* Na folha, sem cartões: cada bloco é uma seção com fio, como num manual. */}
      <View testID="exam-now">
        <SectionHeader title="Agora" />
        <View style={{ gap: theme.space[3] }}>
          <MetricValue value={formatMeasurementValue(latest)} unit={latest.unit} unitSpoken={spokenUnit(latest.unit, latest.value)} state={latestState} size="hero" />
          <RangeBar
            value={latest.value}
            range={{ low: latest.referenceLow ?? undefined, high: latest.referenceHigh ?? undefined, text: latest.referenceText ?? undefined }}
            state={latestState}
            width="fill"
          />
          <View>
            {latestRange ? (
              <Text variant="footnote" color="secondary">
                {`Faixa do laudo: ${latestRange}`}
              </Text>
            ) : null}
            <Text variant="footnote" color="secondary" tabular>
              {formatShortDate(latest.takenOn)}
            </Text>
            <Text variant="footnote" color="secondary">
              {originOf(latest)}
            </Text>
          </View>
          {latest.sourceRecordId ? <DocumentLink onPress={() => openDocument(latest.sourceRecordId!)} title={latestRecord?.title} /> : null}
        </View>
      </View>

      <View testID="exam-trend">
        <SectionHeader title="Evolução" />
        {series.chart.length >= 2 ? (
          <TrendChart points={trendPoints(series)} unit={series.unit} summary={trendSummary(series)} onPointPress={(i) => setSelected(series.chart[i] ?? null)} testID="exam-trend-chart" />
        ) : (
          <Text variant="subheadline" color="secondary">
            {TREND_SINGLE_POINT_TEXT}
          </Text>
        )}
      </View>

      <SectionHeader title="Resultados" action={{ label: 'Adicionar', onPress: addResult, accessibilityHint: 'Abre o formulário de novo resultado' }} />
      <ListSection testID="exam-results">
        {newestFirst.map((m) => {
          const state = flagOf(m);
          // Com banda (R4), a faixa do gráfico vale para os pontos dele; fora dele (ou sem banda), a faixa vai na linha.
          const range = series.band && !offChart.has(m.id) ? null : referenceRangeText(m);
          const record = recordOf(m);
          const value = formatMeasurementValue(m);
          const lines = [range ? `Faixa do laudo: ${range}` : null, offChart.has(m.id) ? OFF_CHART : null, originOf(m)].filter((l): l is string => !!l);
          const label = [formatShortDate(m.takenOn), metricAccessibilityLabel({ value, unit: m.unit, unitSpoken: spokenUnit(m.unit, m.value), state }), ...lines].join(', ');
          return (
            <View key={m.id} style={{ paddingVertical: theme.space[3], gap: theme.space[2] }}>
              <Pressable
                onPress={() => setSelected(m)}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityHint="Abre as opções do resultado"
                android_ripple={{ color: theme.colors.border }}
                testID={`exam-result-${m.id}`}
                style={({ pressed }) => [{ minHeight: theme.minTouchTarget, gap: theme.space[1] }, pressed && { opacity: 0.6 }]}
              >
                <Text variant="bodyStrong" tabular>
                  {formatShortDate(m.takenOn)}
                </Text>
                {/* "↑ 7,4 %, acima da faixa do laudo": ícone + valor + estado numa frase, na tinta da pessoa. */}
                <StateLine state={state} value={measurementValueText(m)} />
                {lines.map((line) => (
                  <Text key={line} variant="footnote" color="secondary">
                    {line}
                  </Text>
                ))}
              </Pressable>
              {m.sourceRecordId ? <DocumentLink onPress={() => openDocument(m.sourceRecordId!)} title={record?.title} /> : null}
            </View>
          );
        })}
      </ListSection>

      {footer}

      <ActionSheet
        visible={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${measurementValueText(selected)} · ${formatShortDate(selected.takenOn)}` : undefined}
        options={
          selected
            ? [
                { label: 'Editar resultado', icon: 'edit', onPress: () => edit(selected) },
                { label: 'Excluir resultado', icon: 'trash', destructive: true, onPress: () => setDeleting(selected) },
              ]
            : []
        }
      />
      <ConfirmSheet
        visible={deleting !== null}
        destructive
        title="Excluir este resultado?"
        message="O resultado sai da lista e do gráfico. Não dá para desfazer."
        confirmLabel="Excluir resultado"
        loading={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          const wasLast = series.points.length === 1;
          remove.mutate(deleting, {
            onSuccess: () => (wasLast ? router.back() : undefined),
            onSettled: () => setDeleting(null),
          });
        }}
      />
    </>,
  );
}

/** "Ver documento" (F2.8): botão próprio, fora do rótulo da linha, com alvo de 44 pt. */
function DocumentLink({ onPress, title }: { onPress: () => void; title?: string }) {
  const theme = useTheme();
  const slop = Math.max(0, (theme.minTouchTarget - theme.typography.subheadline.lineHeight) / 2);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: slop, bottom: slop, left: 8, right: 8 }}
      accessibilityRole="link"
      accessibilityLabel={title ? `Ver documento ${title}` : 'Ver documento'}
      style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}
    >
      <Text variant="subheadline" color="link" style={styles.linkText}>
        Ver documento
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'flex-start' },
  linkText: { fontWeight: '500' },
});
