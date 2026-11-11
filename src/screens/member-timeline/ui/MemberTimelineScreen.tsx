import { useState } from 'react';
import { SectionList, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMyFamily } from '@/entities/family';
import { useMember } from '@/entities/member';
import { RECORD_TYPE_OPTIONS, RecordCard, monthLabel, useMemberTimeline, type RecordType } from '@/entities/health-record';
import { EmptyState, ListSkeleton, LoadErrorState, OfflineBanner, Text, ChipGroup, useTheme } from '@/shared/ui';

/** Linha do tempo de uma pessoa: registros agrupados por mês, do mais recente ao mais antigo, com filtro por tipo. */
export function MemberTimelineScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memberId = typeof id === 'string' ? id : undefined;
  const familyId = useMyFamily().data?.id;
  const member = useMember(memberId);
  const [types, setTypes] = useState<RecordType[]>([]);
  const timeline = useMemberTimeline(familyId, memberId, types);

  const addRecord = () => router.push({ pathname: '/(main)/record/new', params: { memberId: memberId ?? '' } });
  const sections = (timeline.data ?? []).map((g) => ({ key: g.month, title: monthLabel(g.month), data: g.records }));
  const name = member.data?.fullName;

  const body = (() => {
    if (timeline.isError || member.isError) return <LoadErrorState onRetry={() => void timeline.refetch()} />;
    if (member.isSuccess && member.data === null) {
      return <EmptyState icon="person-outline" title="Pessoa não encontrada" message="Ela pode ter sido removida da família." action={{ label: 'Voltar', onPress: () => router.back() }} />;
    }
    if (timeline.isPending) {
      return timeline.fetchStatus === 'paused' ? <LoadErrorState onRetry={() => void timeline.refetch()} /> : <ListSkeleton />;
    }
    if (sections.length === 0) {
      return types.length > 0 ? (
        <EmptyState
          icon="funnel-outline"
          title="Nenhum registro deste tipo"
          message="Tente outro tipo ou limpe o filtro para ver tudo."
          action={{ label: 'Limpar filtro', onPress: () => setTypes([]) }}
        />
      ) : (
        <EmptyState
          icon="folder-open-outline"
          title={name ? `Ainda não há documentos de ${name}` : 'Ainda não há documentos'}
          message="Adicione o primeiro exame, receita ou laudo para montar o histórico."
          action={{ label: 'Adicionar registro', onPress: addRecord, icon: 'add' }}
        />
      );
    }
    return null;
  })();

  // A lista é a raiz da tela (primeiro filho) para o título grande do cabeçalho nativo encolher ao rolar.
  return (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(r) => r.id}
        stickySectionHeadersEnabled={false}
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ paddingHorizontal: theme.layout.screenGutter, paddingBottom: theme.space[10], flexGrow: 1 }}
        ListHeaderComponent={
          <View>
            <OfflineBanner visible={timeline.fetchStatus === 'paused'} />
            <ChipGroup
              options={RECORD_TYPE_OPTIONS}
              value={types}
              onChange={setTypes}
              allLabel="Todos"
              style={{ marginTop: theme.space[2], flexGrow: 0 }}
              testID="type-filter"
            />
          </View>
        }
        ListEmptyComponent={body ?? undefined}
        renderSectionHeader={({ section }) => (
          <Text variant="subhead" color="secondary" accessibilityRole="header" style={{ marginTop: theme.space[5], marginBottom: theme.space[2] }}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <View style={{ marginBottom: theme.space[3] }}>
            <RecordCard record={item} onPress={() => router.push({ pathname: '/(main)/record/[id]', params: { id: item.id } })} />
          </View>
        )}
        testID="timeline-list"
      />
      <Stack.Title large>{name ?? 'Linha do tempo'}</Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="plus" accessibilityLabel="Adicionar registro" onPress={addRecord} />
      </Stack.Toolbar>
    </>
  );
}
