import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useMyFamily } from '@/entities/family';
import { MemberListItem, useMembers } from '@/entities/member';
import { useRecordCounts } from '@/entities/health-record';
import { FloatingActions } from '@/widgets/floating-actions';
import { EmptyState, Icon, IconButton, ListItem, ListSection, ListSkeleton, LoadErrorState, Menu, headerTitleColors, useTheme } from '@/shared/ui';

const recordsLabel = (n: number) => (n === 0 ? 'nenhum registro' : n === 1 ? '1 registro' : `${n} registros`);

/**
 * Home: as pessoas da família. Tocar numa pessoa abre a linha do tempo; o menu "…" cria um registro para ela
 * ou edita; o botão flutuante cria um registro (já com a pessoa escolhida quando só há uma).
 */
export function FamilyHomeScreen({ demo = false }: { demo?: boolean }) {
  const theme = useTheme();
  // O Stack.Title do expo-router zera as cores do título; sem isso o título herda o tint azul dos botões.
  const titleColors = headerTitleColors(theme);
  const router = useRouter();
  const family = useMyFamily().data ?? null;
  const members = useMembers(family?.id);
  const counts = useRecordCounts(family?.id).data;
  const list = members.data ?? [];
  const offline = members.fetchStatus === 'paused';
  const [occupied, setOccupied] = useState(0);
  const [demoDismissed, setDemoDismissed] = useState(false);

  const newRecord = (memberId?: string) =>
    router.push(memberId ? { pathname: '/(main)/record/new', params: { memberId } } : '/(main)/record/new');

  const content = (() => {
    if (members.isPending) return offline ? <LoadErrorState onRetry={() => void members.refetch()} /> : <ListSkeleton />;
    if (members.isError) return <LoadErrorState onRetry={() => void members.refetch()} />;
    if (list.length === 0) {
      return (
        <EmptyState
          icon="people"
          title="Nenhuma pessoa ainda"
          message="Adicione quem terá o histórico de saúde guardado aqui."
          action={{ label: 'Adicionar pessoa', onPress: () => router.push('/(main)/member/new'), icon: 'personAdd' }}
        />
      );
    }
    return (
      <>
        <ListSection header="Pessoas" separatorInset="text">
          {list.map((m) => (
            <MemberListItem
              key={m.id}
              member={m}
              extra={counts ? recordsLabel(counts[m.id] ?? 0) : undefined}
              onPress={() => router.push({ pathname: '/(main)/member/[id]', params: { id: m.id } })}
              trailing={
                <Menu
                  items={[
                    { label: 'Novo registro', icon: 'add', onPress: () => newRecord(m.id) },
                    { label: 'Editar pessoa', icon: 'edit', onPress: () => router.push({ pathname: '/(main)/member/[id]/edit', params: { id: m.id } }) },
                  ]}
                >
                  <IconButton icon="moreCircle" color="textSecondary" accessibilityLabel={`Mais ações para ${m.fullName}`} testID={`member-menu-${m.id}`} />
                </Menu>
              }
            />
          ))}
        </ListSection>
        <ListSection style={{ marginTop: theme.space[5] }} separatorInset="none">
          <ListItem
            leading={<Icon name="personAdd" size={22} color="primary" />}
            title="Adicionar pessoa"
            onPress={() => router.push('/(main)/member/new')}
            chevron={false}
            testID="add-member"
          />
        </ListSection>
      </>
    );
  })();

  return (
    <>
      <FlatList
        data={[content]}
        keyExtractor={() => 'content'}
        renderItem={({ item }) => <View style={{ paddingHorizontal: theme.layout.screenGutter }}>{item}</View>}
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ paddingTop: theme.space[4], paddingBottom: occupied + theme.space[4], flexGrow: 1 }}
        testID="family-home-screen"
      />
      <Stack.Title large style={titleColors.headerTitleStyle} largeStyle={titleColors.headerLargeTitleStyle}>{family ? family.name : 'Sua família'}</Stack.Title>
      <FloatingActions
        offline={offline}
        demo={demo && !demoDismissed}
        onDismissDemo={() => setDemoDismissed(true)}
        action={list.length > 0 ? { label: 'Novo registro', onPress: () => newRecord(list.length === 1 ? list[0]!.id : undefined), testID: 'new-record-fab' } : null}
        onOccupiedChange={setOccupied}
      />
    </>
  );
}
