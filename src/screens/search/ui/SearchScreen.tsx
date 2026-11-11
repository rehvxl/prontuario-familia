import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useMyFamily } from '@/entities/family';
import { useMembers } from '@/entities/member';
import { RECORD_TYPE_OPTIONS, RecordListItem, type RecordType } from '@/entities/health-record';
import { MIN_SEARCH_LENGTH, isSearchable, useSearchRecords } from '@/features/search-records';
import { FloatingActions } from '@/widgets/floating-actions';
import { ChipGroup, EmptyState, ListSection, ListSkeleton, LoadErrorState, headerTitleColors, useTheme } from '@/shared/ui';

/** Busca em todos os registros da família, por texto (título, local, profissional, notas) e/ou tipo. */
export function SearchScreen() {
  const theme = useTheme();
  // O Stack.Title do expo-router zera as cores do título; sem isso o título herda o tint azul dos botões.
  const titleColors = headerTitleColors(theme);
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
          icon="search"
          title="Busque no histórico da família"
          message={`Digite pelo menos ${MIN_SEARCH_LENGTH} letras (exame, médico, local) ou escolha um tipo.`}
        />
      );
    }
    if (search.isError) return <LoadErrorState onRetry={() => void search.refetch()} />;
    if (search.isPending) return search.fetchStatus === 'paused' ? <LoadErrorState onRetry={() => void search.refetch()} /> : <ListSkeleton />;
    if (results.length === 0) {
      return <EmptyState icon="file" title="Nada encontrado" message="Confira a escrita ou tente outro termo ou tipo." />;
    }
    return null;
  })();

  const [occupied, setOccupied] = useState(0);
  const offline = search.fetchStatus === 'paused';
  const shown = searchable && !search.isError && !search.isPending ? results : [];

  // A lista é a raiz da tela (primeiro filho) para o título grande do cabeçalho nativo encolher ao rolar.
  return (
    <>
      <FlatList
        data={shown.length > 0 ? [shown] : []}
        keyExtractor={() => 'results'}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ paddingBottom: occupied + theme.space[4], flexGrow: 1 }}
        ListHeaderComponent={
          <ChipGroup
            options={RECORD_TYPE_OPTIONS}
            value={types}
            onChange={setTypes}
            allLabel="Todos"
            style={{ marginTop: theme.space[2], marginBottom: theme.space[3] }}
            testID="search-type-filter"
          />
        }
        ListEmptyComponent={body ? <View style={{ paddingHorizontal: theme.layout.screenGutter, flex: 1 }}>{body}</View> : undefined}
        renderItem={({ item }) => (
          <ListSection
            header={item.length === 1 ? '1 resultado' : `${item.length} resultados`}
            style={{ marginHorizontal: theme.layout.screenGutter }}
          >
            {item.map((record) => (
              <RecordListItem
                key={record.id}
                record={record}
                memberName={nameOf(record.memberId)}
                onPress={() => router.push({ pathname: '/(main)/record/[id]', params: { id: record.id } })}
              />
            ))}
          </ListSection>
        )}
        testID="search-results"
      />
      <Stack.Title large style={titleColors.headerTitleStyle} largeStyle={titleColors.headerLargeTitleStyle}>Buscar</Stack.Title>
      <Stack.SearchBar
        placeholder="Título, local, médico ou notas"
        placement="automatic"
        autoCapitalize="none"
        onChangeText={(event) => setText(event.nativeEvent.text)}
        onCancelButtonPress={() => setText('')}
      />
      <FloatingActions offline={offline} onOccupiedChange={setOccupied} />
    </>
  );
}
