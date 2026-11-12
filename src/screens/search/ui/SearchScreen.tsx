import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, Platform, View } from 'react-native';
import type { SearchBarCommands } from 'react-native-screens';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useMyFamily } from '@/entities/family';
import { useMembers } from '@/entities/member';
import { RECORD_TYPE_OPTIONS, RecordListItem, type HealthRecord, type RecordType } from '@/entities/health-record';
import { MIN_SEARCH_LENGTH, isSearchable, useSearchRecords } from '@/features/search-records';
import { FloatingActions, floatingFooterOf } from '@/widgets/floating-actions';
import {
  ChipGroup,
  DividerBoard,
  EmptyState,
  Leaf,
  ListSection,
  ListSkeleton,
  LoadErrorState,
  SectionHeader,
  TabMark,
  Text,
  headerOptions,
  leafContentInset,
  useFloatingFooterInset,
  useTheme,
} from '@/shared/ui';

const countLabel = (n: number) => (n === 1 ? '1 resultado' : `${n} resultados`);

/** Resultados na ordem da busca, agrupados por pessoa na ordem em que cada uma aparece. */
function groupByMember(records: HealthRecord[]) {
  const groups = new Map<string, HealthRecord[]>();
  for (const r of records) groups.set(r.memberId, [...(groups.get(r.memberId) ?? []), r]);
  return [...groups.entries()].map(([memberId, items]) => ({ memberId, items }));
}

/** Busca em todos os registros da família, por texto (título, local, profissional, notas) e/ou tipo. */
export function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const searchBar = useRef<SearchBarCommands>(null);
  const familyId = useMyFamily().data?.id;
  const members = useMembers(familyId).data ?? [];
  const [text, setText] = useState('');
  const [types, setTypes] = useState<RecordType[]>([]);
  // Com 1 letra só vale o filtro de tipo (o texto curto é ignorado até ter 2 letras).
  const effectiveText = text.trim().length >= MIN_SEARCH_LENGTH ? text : '';
  const params = { familyId: familyId ?? '', text: effectiveText, types };
  const searchable = isSearchable(params);
  const search = useSearchRecords(params);
  const nameOf = (memberId: string) => members.find((m) => m.id === memberId)?.fullName ?? 'Pessoa';
  const results = search.data ?? [];
  const offline = search.fetchStatus === 'paused';
  const footerInset = useFloatingFooterInset(floatingFooterOf({ offline }));
  const loaded = searchable && search.isSuccess;
  const shown = loaded ? results : [];
  const family = theme.hues.family;
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(family.statusBar);
      return () => setStatusBarStyle('auto');
    }, [family.statusBar]),
  );
  // Campo de busca nativo sobre o cabeçalho ultramar: no iOS o campo fica claro com texto escuro (caret na
  // tinta da família); no Android o campo é a própria barra, então texto e ícones vão em onBoard.
  const searchColors =
    Platform.OS === 'ios'
      ? { barTintColor: theme.colors.surface, textColor: theme.colors.textPrimary, tintColor: family.ink }
      : { textColor: family.onBoard, hintTextColor: family.onBoard, headerIconColor: family.onBoard };

  // O total muda sem o foco sair do campo: anuncia para o leitor de tela (DESIGN_SYSTEM §7.11).
  useEffect(() => {
    if (loaded) AccessibilityInfo.announceForAccessibility(results.length === 0 ? 'Nada encontrado' : countLabel(results.length));
  }, [loaded, results.length]);

  const clear = () => {
    searchBar.current?.clearText();
    setText('');
    setTypes([]);
  };

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
    if (search.isPending) return offline ? <LoadErrorState onRetry={() => void search.refetch()} /> : <ListSkeleton />;
    if (results.length === 0) {
      const term = effectiveText.trim();
      return (
        <EmptyState
          icon="file"
          title="Nada encontrado"
          message={`${term ? `Nenhum registro com "${term}". ` : ''}Confira a escrita ou tente outro termo ou tipo.`}
          action={{ label: 'Limpar busca', onPress: clear, icon: 'close' }}
        />
      );
    }
    return null;
  })();

  // v4: a Busca fica na capa da família (ultramar), com cabeçalho opaco na cor dela e a lista numa folha.
  return (
    <>
      <Stack.Screen options={headerOptions(theme, { board: 'ultramar', contentTitle: true })} />
      <DividerBoard hue="ultramar" testID="screen-board">
        <Leaf scroll={false}>
          <FlatList
            data={groupByMember(shown)}
            keyExtractor={(group) => group.memberId}
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
            style={{ flex: 1 }}
            contentContainerStyle={[leafContentInset(theme), { paddingTop: theme.space[4], paddingBottom: footerInset || theme.space[4], flexGrow: 1 }]}
            ListHeaderComponent={
              <View style={{ gap: theme.space[3], marginBottom: theme.space[2] }}>
                <Text variant="largeTitle" color="link">
                  Buscar
                </Text>
                <ChipGroup
                  options={RECORD_TYPE_OPTIONS}
                  value={types}
                  onChange={setTypes}
                  allLabel="Todos"
                  testID="search-type-filter"
                />
                {shown.length > 0 ? (
                  <Text variant="subheadline" color="secondary" tabular accessibilityLiveRegion="polite" testID="search-count">
                    {countLabel(shown.length)}
                  </Text>
                ) : null}
              </View>
            }
            ListEmptyComponent={body ? <View style={{ flex: 1 }}>{body}</View> : undefined}
            renderItem={({ item }) => (
              <View style={{ marginBottom: theme.space[5], gap: theme.space[2] }}>
                {/* A marca de aba da pessoa ao lado do nome escrito (a cor nunca é a única pista). */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
                  <TabMark id={item.memberId} size="md" />
                  <SectionHeader title={nameOf(item.memberId)} style={{ flex: 1, marginTop: 0, marginBottom: 0 }} />
                </View>
                <ListSection>
                  {item.items.map((record) => (
                    <RecordListItem
                      key={record.id}
                      record={record}
                      onPress={() => router.push({ pathname: '/(main)/record/[id]', params: { id: record.id } })}
                    />
                  ))}
                </ListSection>
              </View>
            )}
            testID="search-results"
          />
        </Leaf>
      </DividerBoard>
      <Stack.SearchBar
        ref={searchBar}
        placeholder="Exames, médicos, locais, vacinas"
        placement="automatic"
        autoCapitalize="none"
        onChangeText={(event) => setText(event.nativeEvent.text)}
        onCancelButtonPress={() => setText('')}
        {...searchColors}
      />
      <FloatingActions offline={offline} />
    </>
  );
}
