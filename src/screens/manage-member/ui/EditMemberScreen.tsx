import { useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMember } from '@/entities/member';
import { useRemoveMember, useUpdateMember } from '@/features/manage-members';
import { MemberForm } from '@/widgets/member-form';
import { TOOLBAR_ICONS } from '@/shared/ui/navigation';
import { Banner, ConfirmSheet, EmptyState, LoadErrorState, Screen, Spinner, categoricalIndexFor, errorMessage, headerOptions, useTheme } from '@/shared/ui';

/**
 * Editar ou remover uma pessoa. Remover apaga também os registros e anexos dela (com confirmação).
 * v4: continua na divisória da pessoa (cabeçalho e fundo na cor dela), como a tela de onde se veio.
 */
export function EditMemberScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memberId = typeof id === 'string' ? id : undefined;
  const member = useMember(memberId);
  const update = useUpdateMember();
  const remove = useRemoveMember();
  const [confirming, setConfirming] = useState(false);

  if (member.isPending || remove.isSuccess) return <Screen scroll={false}><Spinner fill label="Carregando" /></Screen>;
  if (member.isError) return <Screen scroll={false}><LoadErrorState onRetry={() => member.refetch()} /></Screen>;
  if (!member.data) {
    return (
      <Screen scroll={false}>
        <EmptyState tone="error" title="Pessoa não encontrada" message="Ela pode ter sido removida da família." action={{ label: 'Voltar', onPress: () => router.back() }} />
      </Screen>
    );
  }
  const m = member.data;
  const hue = theme.personBoard(categoricalIndexFor(m.id));

  return (
    <Screen testID="edit-member-screen" board={hue}>
      <Stack.Screen options={headerOptions(theme, { board: hue })} />
      <StatusBar style={hue.statusBar} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon={TOOLBAR_ICONS.more} title="Mais ações" accessibilityLabel="Mais ações">
          <Stack.Toolbar.MenuAction icon="trash" destructive onPress={() => setConfirming(true)}>
            Remover pessoa
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <MemberForm
        initial={{ fullName: m.fullName, birthDate: m.birthDate, relationship: m.relationship, sex: m.sex }}
        avatarId={m.id}
        submitLabel="Salvar alterações"
        submitting={update.isPending}
        error={update.error}
        onSubmit={(values) => update.mutate({ id: m.id, changes: values }, { onSuccess: () => router.back() })}
      />
      {remove.error && !confirming ? <Banner tone="danger" message={errorMessage(remove.error, 'Não foi possível remover. Nada foi apagado.')} style={{ marginTop: theme.space[4] }} testID="remove-error" /> : null}
      <ConfirmSheet
        visible={confirming}
        destructive
        title={`Remover ${m.fullName}?`}
        message="Todos os registros e anexos desta pessoa serão apagados. Não dá para desfazer."
        confirmLabel="Remover pessoa"
        loading={remove.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          remove.mutate(m.id, {
            onSuccess: () => router.dismissTo('/(main)/(tabs)/(family)'),
            onError: () => setConfirming(false),
          })
        }
      />
    </Screen>
  );
}
