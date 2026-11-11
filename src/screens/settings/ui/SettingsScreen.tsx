import { useState } from 'react';
import { useCurrentUser } from '@/entities/session';
import { useExportData } from '@/features/export-data';
import { useSignOut } from '@/features/auth';
import { Banner, ConfirmSheet, Icon, ListItem, ListSection, Screen, Spinner, errorMessage, useTheme } from '@/shared/ui';
import { shareExport } from '../lib/share-export';

/** Ação assíncrona vinda da rota (que a monta com os hooks da camada application). */
export interface AccountFlow {
  mutate: (variables: void, options?: { onSuccess?: () => void }) => void;
  isPending: boolean;
  error: unknown;
  reset: () => void;
}

export interface SettingsScreenProps {
  mode: 'demo' | 'supabase';
  revokeConsent: AccountFlow;
  deleteAccount: AccountFlow;
}

type Sheet = 'signOut' | 'revoke' | 'delete1' | 'delete2' | null;

/** Ajustes: conta, modo, exportar dados, revogar consentimento, sair e excluir conta (confirmação dupla). */
export function SettingsScreen({ mode, revokeConsent, deleteAccount }: SettingsScreenProps) {
  const theme = useTheme();
  const user = useCurrentUser().data ?? null;
  const signOut = useSignOut();
  const exportData = useExportData();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [exportError, setExportError] = useState<unknown>(null);
  const [exporting, setExporting] = useState(false);

  const doExport = async () => {
    setExportError(null);
    setExporting(true);
    try {
      const file = await exportData.mutateAsync();
      await shareExport(file);
    } catch (error) {
      setExportError(error);
    } finally {
      setExporting(false);
    }
  };

  if (!user) return <Screen scroll={false}><Spinner fill label="Carregando" /></Screen>;
  const error = exportError ?? signOut.error ?? revokeConsent.error ?? deleteAccount.error;

  return (
    <Screen testID="settings-screen">
      {error ? <Banner tone="danger" message={errorMessage(error, 'Não foi possível concluir. Tente novamente.')} style={{ marginBottom: theme.space[2] }} testID="settings-error" /> : null}

      <ListSection header="Conta" footer={mode === 'demo' ? 'No modo demonstração os dados ficam só neste aparelho.' : undefined} style={{ marginTop: theme.space[2] }}>
        <ListItem leading={<Icon name="personCircle" size={26} color="textSecondary" />} title={user.email ?? user.displayName ?? 'Conta sem e-mail'} subtitle="Conectado" />
        <ListItem
          leading={<Icon name="flask" size={24} color="textSecondary" />}
          title={mode === 'demo' ? 'Modo demonstração' : 'Conectado ao servidor'}
          subtitle={mode === 'demo' ? 'Dados de teste, sem servidor.' : 'Seus dados ficam protegidos na nuvem.'}
          testID="mode-item"
        />
      </ListSection>

      <ListSection header="Seus dados" style={{ marginTop: theme.space[6] }}>
        <ListItem
          leading={<Icon name="download" size={24} color="textSecondary" />}
          title="Exportar meus dados"
          subtitle="Gera um arquivo JSON com tudo o que você guardou."
          onPress={() => void doExport()}
          disabled={exporting}
          trailing={exporting ? <Spinner size="small" /> : undefined}
          chevron
          testID="export-data"
        />
        <ListItem
          leading={<Icon name="hand" size={24} color="textSecondary" />}
          title="Revogar consentimento"
          subtitle="Para de tratar seus dados de saúde. Você precisará aceitar de novo para continuar."
          onPress={() => setSheet('revoke')}
          chevron
          testID="revoke-consent"
        />
      </ListSection>

      <ListSection style={{ marginTop: theme.space[6] }}>
        <ListItem leading={<Icon name="logout" size={24} color="textSecondary" />} title="Sair" onPress={() => setSheet('signOut')} chevron testID="sign-out" />
      </ListSection>

      <ListSection
        footer="Apaga a conta e todos os dados da família, para sempre."
        style={{ marginTop: theme.space[6], marginBottom: theme.space[8] }}
      >
        <ListItem
          leading={<Icon name="trash" size={24} color="danger" />}
          title="Excluir conta"
          destructive
          onPress={() => {
            deleteAccount.reset();
            setSheet('delete1');
          }}
          testID="delete-account"
        />
      </ListSection>

      <ConfirmSheet
        visible={sheet === 'signOut'}
        title="Sair da conta?"
        message="Seus dados continuam guardados. Para voltar, é só entrar de novo."
        confirmLabel="Sair"
        loading={signOut.isPending}
        onCancel={() => setSheet(null)}
        onConfirm={() => signOut.mutate(undefined, { onSettled: () => setSheet(null) })}
      />
      <ConfirmSheet
        visible={sheet === 'revoke'}
        destructive
        title="Revogar o consentimento?"
        message="O app deixa de tratar seus dados de saúde e volta à tela de consentimento. Seus registros não são apagados."
        confirmLabel="Revogar consentimento"
        loading={revokeConsent.isPending}
        onCancel={() => setSheet(null)}
        onConfirm={() => revokeConsent.mutate(undefined, { onSuccess: () => setSheet(null) })}
      />
      <ConfirmSheet
        visible={sheet === 'delete1'}
        destructive
        title="Excluir sua conta?"
        message="Todos os dados da família serão apagados para sempre: pessoas, registros e anexos. Considere exportar antes."
        confirmLabel="Continuar"
        onCancel={() => setSheet(null)}
        onConfirm={() => setSheet('delete2')}
      />
      <ConfirmSheet
        visible={sheet === 'delete2'}
        destructive
        title="Tem certeza absoluta?"
        message="Esta ação não pode ser desfeita. Sua conta e todos os dados da família serão excluídos agora."
        confirmLabel="Excluir tudo definitivamente"
        loading={deleteAccount.isPending}
        onCancel={() => setSheet(null)}
        onConfirm={() => deleteAccount.mutate(undefined, { onSuccess: () => setSheet(null) })}
      />
    </Screen>
  );
}
