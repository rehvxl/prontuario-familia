import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMyFamily } from '@/entities/family';
import { useMember } from '@/entities/member';
import { RECORD_TYPE_OPTIONS, RecordListItem, monthLabel, useMemberTimeline, type RecordType } from '@/entities/health-record';
import { FloatingActions } from '@/widgets/floating-actions';
import { ChipGroup, EmptyState, ListSection, ListSkeleton, LoadErrorState, headerTitleColors, useTheme } from '@/shared/ui';

/** Linha do tempo de uma pessoa: registros agrupados por mês, do mais recente ao mais antigo, com filtro por tipo. */
export function MemberTimelineScreen() {
  const theme = useTheme();
  // O Stack.Title do expo-router zera as cores do título; sem isso o título herda o tint azul dos botões.
  const titleColors = headerTitleColors(theme);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memberId = typeof id === 'string' ? id : undefined;
  const familyId = useMyFamily().data?.id;
  const member = useMember(memberId);
  const [types, setTypes] = useState<RecordType[]>([]);
  const timeline = useMemberTimeline(familyId, memberId, types);
  const [occupied, setOccupied] = useState(0);

  const addRecord = () => router.push({ pathname: '/(main)/record/new', params: { memberId: memberId ?? '' } });
  const sections = (timeline.data ?? []).map((g) => ({ key: g.month, title: monthLabel(g.month), data: g.records }));
  const offline = timeline.fetchStatus === 'paused';
  const name = member.data?.fullName;

  const body = (() => {
    if (timeline.isError || member.isError) return <LoadErrorState onRetry={() => void timeline.refetch()} />;
    if (member.isSuccess && member.data === null) {
      return <EmptyState icon="person" title="Pessoa não encontrada" message="Ela pode ter sido removida da família." action={{ label: 'Voltar', onPress: () => router.back() }} />;
    }
    if (timeline.isPending) {
      return timeline.fetchStatus === 'paused' ? <LoadErrorState onRetry={() => void timeline.refetch()} /> : <ListSkeleton />;
    }
    if (sections.length === 0) {
      return types.length > 0 ? (
        <EmptyState
          icon="filter"
          title="Nenhum registro deste tipo"
          message="Tente outro tipo ou limpe o filtro para ver tudo."
          action={{ label: 'Limpar filtro', onPress: () => setTypes([]) }}
        />
      ) : (
        <EmptyState
          icon="folder"
          title={name ? `Ainda não há documentos de ${name}` : 'Ainda não há documentos'}
          message="Toque em “Novo registro” para adicionar o primeiro exame, receita ou laudo."
        />
      );
    }
    return null;
  })();

  // A lista é a raiz da tela (primeiro filho) para o título grande do cabeçalho nativo encolher ao rolar.
  return (
    <>
      <FlatList
        data={sections}
        keyExtractor={(section) => section.key}
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ paddingBottom: occupied + theme.space[4], flexGrow: 1 }}
        ListHeaderComponent={
          <ChipGroup
            options={RECORD_TYPE_OPTIONS}
            value={types}
            onChange={setTypes}
            allLabel="Todos"
            style={{ marginTop: theme.space[2], marginBottom: theme.space[2] }}
            testID="type-filter"
          />
        }
        ListEmptyComponent={body ? <View style={{ paddingHorizontal: theme.layout.screenGutter, flex: 1 }}>{body}</View> : undefined}
        renderItem={({ item: section }) => (
          <ListSection header={section.title} style={{ marginTop: theme.space[4], marginHorizontal: theme.layout.screenGutter }} testID={`month-${section.key}`}>
            {section.data.map((record) => (
              <RecordListItem key={record.id} record={record} onPress={() => router.push({ pathname: '/(main)/record/[id]', params: { id: record.id } })} />
            ))}
          </ListSection>
        )}
        testID="timeline-list"
      />
      <Stack.Title large style={titleColors.headerTitleStyle} largeStyle={titleColors.headerLargeTitleStyle}>{name ?? 'Linha do tempo'}</Stack.Title>
      <FloatingActions
        offline={offline}
        action={member.data ? { label: 'Novo registro', onPress: addRecord, testID: 'new-record-fab' } : null}
        onOccupiedChange={setOccupied}
      />
    </>
  );
}
