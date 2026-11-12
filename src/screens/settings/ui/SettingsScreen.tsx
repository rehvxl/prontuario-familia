import { useCallback, useState } from 'react';
import { Stack, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCurrentUser } from '@/entities/session';
import { useExportData } from '@/features/export-data';
import { useSignOut } from '@/features/auth';
import { Avatar, Banner, ConfirmSheet, IconTile, ListItem, ListSection, Screen, Spinner, errorMessage, useTheme } from '@/shared/ui';
import { shareExport } from '../lib/share-export';

/** Ação assíncrona vinda da rota (que a monta com os hooks da camada application). */
export interface AccountFlow {
  mutate: (variables: void, options?: { onSuccess?: () => void }) => void;
  isPending: boolean;
  error: unknown;
  reset: () => void;
}

/** "Carregar família de exemplo": fecha a confirmação ao terminar, com sucesso ou erro, e diz se gravou algo. */
export interface DemoFamilyFlow {
  mutate(variables: void, options?: { onSettled?: () => void }): void;
  isPending: boolean;
  error: unknown;
  reset: () => void;
  /** `created: false` quando a família de exemplo já estava carregada. */
  data?: { created: boolean };
}

export interface SettingsScreenProps {
  mode: 'demo' | 'supabase';
  revokeConsent: AccountFlow;
  deleteAccount: AccountFlow;
  /** Só no modo demo: "Carregar família de exemplo" (Q10/L1). */
  loadDemoFamily?: DemoFamilyFlow;
}

type Sheet = 'signOut' | 'revoke' | 'delete1' | 'delete2' | 'demo' | null;

/** v4: Ajustes na capa da família, sem cabeçalho (raiz sem botões): a folha começa abaixo da barra de status. */
const EDGES = ['top', 'left', 'right', 'bottom'] as const;

/** Ajustes: conta, privacidade, família de exemplo (demo), sair e excluir conta (confirmação dupla). */
export function SettingsScreen({ mode, revokeConsent, deleteAccount, loadDemoFamily }: SettingsScreenProps) {
  const theme = useTheme();
  const user = useCurrentUser().data ?? null;
  const signOut = useSignOut();
  const exportData = useExportData();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [exportError, setExportError] = useState<unknown>(null);
  const [exporting, setExporting] = useState(false);
  const statusBar = theme.hues.family.statusBar;
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(statusBar);
      return () => setStatusBarStyle('auto');
    }, [statusBar]),
  );

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

  const header = <Stack.Screen options={{ headerShown: false }} />;
  if (!user) {
    return (
      <>
        {header}
        <Screen scroll={false} board="ultramar" edges={EDGES}>
          <Spinner fill label="Carregando" />
        </Screen>
      </>
    );
  }
  const error = exportError ?? signOut.error ?? revokeConsent.error ?? deleteAccount.error;
  const accountName = user.displayName ?? user.email ?? 'Conta sem e-mail';
  const demoDone = loadDemoFamily?.data && !loadDemoFamily.isPending ? loadDemoFamily.data : null;

  return (
    <>
      {header}
      <Screen heading={{ title: 'Ajustes' }} board="ultramar" edges={EDGES} testID="settings-screen">
        {error ? <Banner tone="danger" message={errorMessage(error, 'Não foi possível concluir. Tente novamente.')} style={{ marginBottom: theme.space[4] }} testID="settings-error" /> : null}

        <ListSection header="Conta" footer={mode === 'demo' ? 'No modo demonstração os dados ficam só neste aparelho.' : undefined}>
          <ListItem
            leading={<Avatar name={accountName} id={user.id} size="sm" />}
            title={accountName}
            subtitle={user.displayName && user.email ? user.email : 'Conectado'}
          />
          <ListItem
            leading={<IconTile icon="flask" />}
            title={mode === 'demo' ? 'Modo demonstração' : 'Conectado ao servidor'}
            subtitle={mode === 'demo' ? 'Dados de teste, sem servidor.' : 'Seus dados ficam protegidos na nuvem.'}
            testID="mode-item"
          />
        </ListSection>

        <ListSection header="Privacidade" style={{ marginTop: theme.space[7] }}>
          <ListItem
            leading={<IconTile icon="download" />}
            title="Exportar meus dados"
            subtitle={exporting ? 'Preparando seus dados…' : 'Gera um arquivo JSON com documentos, exames, vacinas, medicamentos e sinais vitais.'}
            onPress={() => void doExport()}
            disabled={exporting}
            trailing={exporting ? <Spinner size="small" /> : undefined}
            chevron
            testID="export-data"
          />
          <ListItem
            leading={<IconTile icon="hand" />}
            title="Revogar consentimento"
            subtitle="Para de tratar seus dados de saúde. Você precisará aceitar de novo para continuar."
            onPress={() => setSheet('revoke')}
            chevron
            testID="revoke-consent"
          />
          <ListItem
            leading={<IconTile icon="privacy" />}
            title="Leitura de documentos: no aparelho"
            subtitle="O texto lido não é enviado nem guardado."
            testID="ocr-on-device"
          />
        </ListSection>

        {loadDemoFamily ? (
          <ListSection
            header="Demonstração"
            footer="Pessoas, documentos e dados de saúde fictícios, para conhecer o app. Nada do que você guardou é apagado."
            style={{ marginTop: theme.space[7] }}
          >
            <ListItem
              leading={<IconTile icon="people" />}
              title="Carregar família de exemplo"
              subtitle={loadDemoFamily.isPending ? 'Carregando a família de exemplo…' : undefined}
              onPress={() => {
                loadDemoFamily.reset();
                setSheet('demo');
              }}
              disabled={loadDemoFamily.isPending}
              trailing={loadDemoFamily.isPending ? <Spinner size="small" /> : undefined}
              chevron
              testID="load-demo-family"
            />
          </ListSection>
        ) : null}
        {loadDemoFamily?.error ? (
          <Banner
            tone="danger"
            message={errorMessage(loadDemoFamily.error, 'Não foi possível carregar a família de exemplo. Tente de novo.')}
            style={{ marginTop: theme.space[3] }}
            testID="demo-family-error"
          />
        ) : null}
        {demoDone ? (
          <Banner
            tone="success"
            message={demoDone.created ? 'Família de exemplo carregada. Veja na aba Família.' : 'A família de exemplo já está carregada.'}
            style={{ marginTop: theme.space[3] }}
            testID="demo-family-done"
          />
        ) : null}

        <ListSection style={{ marginTop: theme.space[7] }}>
          <ListItem leading={<IconTile icon="logout" />} title="Sair" onPress={() => setSheet('signOut')} chevron testID="sign-out" />
        </ListSection>

        <ListSection footer="Apaga a conta e todos os dados da família, para sempre." style={{ marginTop: theme.space[7], marginBottom: theme.space[8] }}>
          <ListItem
            leading={<IconTile icon="trash" color="danger" />}
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
        {loadDemoFamily ? (
          <ConfirmSheet
            visible={sheet === 'demo'}
            title="Carregar a família de exemplo?"
            message="A Família Souza entra com pessoas, documentos, exames, vacinas e medicamentos fictícios. Nada do que você guardou é apagado."
            confirmLabel="Carregar família de exemplo"
            loading={loadDemoFamily.isPending}
            onCancel={() => setSheet(null)}
            onConfirm={() => loadDemoFamily.mutate(undefined, { onSettled: () => setSheet(null) })}
            testID="demo-family-sheet"
          />
        ) : null}
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
    </>
  );
}
