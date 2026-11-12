import { useMemo } from 'react';
import { Stack, useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { TOOLBAR_ICONS } from '@/shared/ui/navigation';
import { StatusBar } from 'expo-status-bar';
import { useMyFamily } from '@/entities/family';
import { useMemberTimeline } from '@/entities/health-record';
import { useMember } from '@/entities/member';
import {
  GROUP_TITLES,
  LAB_REFERENCE_NOTICE,
  MeasurementRow,
  buildSeries,
  computeFlag,
  findAnalyte,
  measurementOriginText,
  useMemberMeasurements,
  type Measurement,
  type MeasurementSeries,
} from '@/entities/measurement';
import { EmptyState, ListSection, ListSkeleton, Screen, Text, categoricalIndexFor, headerOptions, useTheme } from '@/shared/ui';

const isOutOfRange = (m: Measurement) => {
  const flag = computeFlag(m.value, m.referenceLow, m.referenceHigh);
  return flag === 'high' || flag === 'low';
};

interface SeriesGroup {
  key: string;
  title: string;
  series: MeasurementSeries[];
}

/**
 * Séries agrupadas pelo grupo do catálogo (GROUP_TITLES; fora do catálogo vai em "Outros exames").
 * Fora da faixa primeiro, nos grupos e dentro deles; o resto mantém a ordem do `buildSeries` (mais recente primeiro).
 */
function groupSeries(all: MeasurementSeries[]): SeriesGroup[] {
  const groups = new Map<string, MeasurementSeries[]>();
  for (const s of all) {
    const key = findAnalyte(s.code)?.group ?? 'other';
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  const flagged = (s: MeasurementSeries) => (isOutOfRange(s.latest) ? 1 : 0);
  return [...groups]
    .map(([key, series]) => ({
      key,
      title: key === 'other' ? 'Outros exames' : GROUP_TITLES[key as keyof typeof GROUP_TITLES],
      series: [...series].sort((a, b) => flagged(b) - flagged(a)),
    }))
    .sort((a, b) => flagged(b.series[0]!) - flagged(a.series[0]!));
}

/** Exames da pessoa por série (spec F2.1; rota member/[id]/exams). */
export function MemberExamsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memberId = typeof id === 'string' ? id : '';
  const member = useMember(memberId || undefined);
  const familyId = useMyFamily().data?.id;
  const measurements = useMemberMeasurements(memberId);
  // Só para a origem (S5): se falhar, a linha diz "Do documento" sem o título.
  const timeline = useMemberTimeline(familyId, memberId || undefined);
  // v4: a tela fica na divisória da pessoa (cabeçalho opaco na cor dela; o título vai na folha).
  const hue = theme.personBoard(categoricalIndexFor(memberId));
  const focused = useIsFocused();

  const groups = useMemo(() => groupSeries(buildSeries(measurements.data ?? [])), [measurements.data]);
  const records = useMemo(() => new Map((timeline.data ?? []).flatMap((g) => g.records).map((r) => [r.id, r])), [timeline.data]);

  const addResult = () => router.push({ pathname: '/(main)/measurement/new', params: { memberId } });
  const openSeries = (s: MeasurementSeries) => router.push({ pathname: '/(main)/member/[id]/exams/[series]', params: { id: memberId, series: s.key } });

  const body = (() => {
    if (measurements.isError || member.isError) {
      return (
        <EmptyState
          tone="error"
          title="Não foi possível carregar os exames."
          action={{ label: 'Tentar de novo', icon: 'refresh-outline', onPress: () => void Promise.all([measurements.refetch(), member.refetch()]) }}
        />
      );
    }
    if (member.isSuccess && member.data === null) {
      return <EmptyState icon="person" title="Pessoa não encontrada" message="Ela pode ter sido removida da família." action={{ label: 'Voltar', onPress: () => router.back() }} />;
    }
    if (measurements.isPending) return <ListSkeleton />;
    if (groups.length === 0) {
      return (
        <EmptyState
          icon="flask"
          title="Nenhum exame registrado."
          message="Adicione um resultado ou guarde um laudo para preencher automaticamente."
          action={{ label: 'Adicionar resultado', onPress: addResult }}
        />
      );
    }
    return groups.map((g, i) => (
      <ListSection key={g.key} header={g.title} style={{ marginTop: i === 0 ? theme.space[2] : theme.layout.sectionHeaderTop }} testID={`exam-group-${g.key}`}>
        {g.series.map((s) => {
          const record = s.latest.sourceRecordId ? records.get(s.latest.sourceRecordId) : undefined;
          return (
            <MeasurementRow
              key={s.key}
              measurement={s.latest}
              origin={measurementOriginText(s.latest, record)}
              onPress={() => openSeries(s)}
              testID={`exam-series-${s.key}`}
            />
          );
        })}
      </ListSection>
    ));
  })();

  return (
    <Screen testID="member-exams-screen" board={hue} heading={{ title: 'Exames', subtitle: member.data?.fullName }}>
      <Stack.Screen options={headerOptions(theme, { board: hue, contentTitle: true })} />
      {focused ? <StatusBar style={hue.statusBar} /> : null}
      {member.data ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button icon={TOOLBAR_ICONS.add} accessibilityLabel="Adicionar resultado" onPress={addResult} />
        </Stack.Toolbar>
      ) : null}
      {body}
      <Text variant="footnote" color="secondary" style={{ marginTop: theme.space[6] }}>
        {LAB_REFERENCE_NOTICE}
      </Text>
    </Screen>
  );
}
