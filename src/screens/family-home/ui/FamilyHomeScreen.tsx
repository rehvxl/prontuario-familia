import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useMyFamily } from '@/entities/family';
import { MemberListItem, useMembers } from '@/entities/member';
import {
  Button,
  Divider,
  EmptyState,
  IconButton,
  ListSkeleton,
  LoadErrorState,
  OfflineBanner,
  Screen,
  useTheme,
} from '@/shared/ui';

/** Home: as pessoas da família. Tocar abre a linha do tempo; o lápis edita/remove; o botão cria um registro. */
export function FamilyHomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const family = useMyFamily().data ?? null;
  const members = useMembers(family?.id);
  const list = members.data ?? [];

  const content = (() => {
    if (members.isPending) return members.fetchStatus === 'paused' ? <LoadErrorState onRetry={() => void members.refetch()} /> : <ListSkeleton />;
    if (members.isError) return <LoadErrorState onRetry={() => void members.refetch()} />;
    if (list.length === 0) {
      return (
        <EmptyState
          icon="people-outline"
          title="Nenhuma pessoa ainda"
          message="Adicione quem terá o histórico de saúde guardado aqui."
          action={{ label: 'Adicionar pessoa', onPress: () => router.push('/(main)/member/new'), icon: 'person-add-outline' }}
        />
      );
    }
    return (
      <View>
        {list.map((m, i) => (
          <View key={m.id}>
            {i > 0 ? <Divider /> : null}
            <MemberListItem
              member={m}
              onPress={() => router.push({ pathname: '/(main)/member/[id]', params: { id: m.id } })}
              trailing={
                <IconButton
                  icon="create-outline"
                  accessibilityLabel={`Editar ${m.fullName}`}
                  onPress={() => router.push({ pathname: '/(main)/member/[id]/edit', params: { id: m.id } })}
                  testID={`edit-member-${m.id}`}
                />
              }
            />
          </View>
        ))}
        <Button
          label="Adicionar pessoa"
          variant="ghost"
          icon="person-add-outline"
          onPress={() => router.push('/(main)/member/new')}
          style={{ marginTop: theme.space[4] }}
          testID="add-member"
        />
      </View>
    );
  })();

  return (
    <Screen testID="family-home-screen">
      <Stack.Title large>{family ? family.name : 'Sua família'}</Stack.Title>
      {list.length > 0 ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button icon="plus" accessibilityLabel="Adicionar registro" onPress={() => router.push('/(main)/record/new')} />
        </Stack.Toolbar>
      ) : null}
      <OfflineBanner visible={members.fetchStatus === 'paused'} />
      {content}
    </Screen>
  );
}
