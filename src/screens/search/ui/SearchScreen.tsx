import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useMyFamily } from '@/entities/family';
import { useMembers } from '@/entities/member';
import { RECORD_TYPE_OPTIONS, RecordCard, type RecordType } from '@/entities/health-record';
import { MIN_SEARCH_LENGTH, isSearchable, useSearchRecords } from '@/features/search-records';
import { ChipGroup, EmptyState, ListSkeleton, LoadErrorState, OfflineBanner, useTheme } from '@/shared/ui';

/** Busca em todos os registros da família, por texto (título, local, profissional, notas) e/ou tipo. */
export function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const familyId = useMyFamily().data?.id;
  const members = useMembers(familyId).data ?? [];
  const [text, setText] = useState('');
  const [types, setTypes] = useState<RecordType[]>([]);
  // Com 1 letra só vale o filtro de tipo (o texto curto é ignorado até ter 2 letras).
  const effectiveText = text.trim().length >= MIN_SEARCH_LENGTH ? text : '';
  const params = { familyId: familyId ?? '', text: effectiveText, types };
  const searchable = isSearchable(params);
  const search = useSearchRecords(params);
  const nameOf = (memberId: string) => members.find((m) => m.id === memberId)?.fullName;
  const results = search.data ?? [];

  const body = (() => {
    if (!searchable) {
      return (
        <EmptyState
          icon="search-outline"
          title="Busque no histórico da família"
          message={`Digite pelo menos ${MIN_SEARCH_LENGTH} letras (exame, médico, local) ou escolha um tipo.`}
        />
      );
    }
    if (search.isError) return <LoadErrorState onRetry={() => void search.refetch()} />;
    if (search.isPending) return search.fetchStatus === 'paused' ? <LoadErrorState onRetry={() => void search.refetch()} /> : <ListSkeleton />;
    if (results.length === 0) {
      return <EmptyState icon="document-outline" title="Nada encontrado" message="Confira a escrita ou tente outro termo ou tipo." />;
    }
    return null;
  })();

  // A lista é a raiz da tela (primeiro filho) para o título grande do cabeçalho nativo encolher ao rolar.
  return (
    <>
      <FlatList
        data={searchable && !search.isError && !search.isPending ? results : []}
        keyExtractor={(r) => r.id}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ paddingHorizontal: theme.layout.screenGutter, paddingBottom: theme.space[10], flexGrow: 1 }}
        ItemSeparatorComponent={() => <View style={{ height: theme.space[3] }} />}
        ListHeaderComponent={
          <View style={{ marginBottom: theme.space[3] }}>
            <OfflineBanner visible={search.fetchStatus === 'paused'} />
            <ChipGroup
              options={RECORD_TYPE_OPTIONS}
              value={types}
              onChange={setTypes}
              allLabel="Todos"
              style={{ marginTop: theme.space[2], flexGrow: 0 }}
              testID="search-type-filter"
            />
          </View>
        }
        ListEmptyComponent={body ?? undefined}
        renderItem={({ item }) => (
          <RecordCard record={item} memberName={nameOf(item.memberId)} onPress={() => router.push({ pathname: '/(main)/record/[id]', params: { id: item.id } })} />
        )}
        testID="search-results"
      />
      <Stack.Title large>Buscar</Stack.Title>
      <Stack.SearchBar
        placeholder="Título, local, médico ou notas"
        placement="automatic"
        autoCapitalize="none"
        onChangeText={(event) => setText(event.nativeEvent.text)}
        onCancelButtonPress={() => setText('')}
      />
    </>
  );
}
