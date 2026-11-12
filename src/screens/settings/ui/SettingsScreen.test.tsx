import { useMutation } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DEPENDENCY_KEYS } from '@/shared/lib';
import { renderWithDependencies } from '@/shared/lib/testing';
import { ThemeProvider, lightTheme } from '@/shared/ui';
import { SettingsScreen, type AccountFlow } from './SettingsScreen';

jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useFocusEffect: () => undefined }));
// BottomSheet.ios é folha nativa do SwiftUI (sem árvore RN tocável): nos testes usa a variante em React Native.
jest.mock('@/shared/ui/components/BottomSheet.ios', () => jest.requireActual('@/shared/ui/components/BottomSheet.tsx'));

const activate = (el: Parameters<typeof fireEvent>[0]) => fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

const idle: AccountFlow = { mutate: jest.fn(), isPending: false, error: null, reset: jest.fn() };
const user = { id: 'u1', email: 'ana@exemplo.com', displayName: 'Ana Souza', provider: 'email' as const };

/** A rota monta a mutação com o hook da application; aqui, uma mutação real com o `seed` do teste. */
function DemoRoute({ seed }: { seed?: () => Promise<{ created: boolean }> }) {
  const loadDemoFamily = useMutation({ mutationFn: () => (seed ? seed() : Promise.resolve({ created: true })) });
  return <SettingsScreen mode={seed ? 'demo' : 'supabase'} revokeConsent={idle} deleteAccount={idle} loadDemoFamily={seed ? loadDemoFamily : undefined} />;
}

async function renderSettings(seed?: () => Promise<{ created: boolean }>) {
  const { wrapper: Deps } = renderWithDependencies({
    [DEPENDENCY_KEYS.auth]: { getCurrentUser: async () => user, onAuthStateChange: () => () => undefined, signOut: jest.fn() },
    [DEPENDENCY_KEYS.dataExport]: { exportMyData: jest.fn() },
  });
  await render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
      <ThemeProvider scheme="light" reducedMotion>
        <Deps>
          <DemoRoute seed={seed} />
        </Deps>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  await screen.findByTestId('settings-screen');
}

const confirmDemo = async () => {
  await fireEvent.press(screen.getByRole('button', { name: 'Carregar família de exemplo' }));
  const sheet = await screen.findByTestId('demo-family-sheet');
  expect(within(sheet).getByText('Carregar a família de exemplo?')).toBeOnTheScreen();
  await activate(within(sheet).getByRole('button', { name: 'Carregar família de exemplo' }));
};

describe('SettingsScreen (v3)', () => {
  it('título "Ajustes", conta, privacidade com a leitura no aparelho; fora do demo, sem família de exemplo', async () => {
    await renderSettings();
    expect(screen.getByRole('header', { name: 'Ajustes' })).toBeOnTheScreen();
    // v4: na capa da família (ultramar), numa folha sem furos.
    const paints = (color: string) => StyleSheet.flatten(screen.getByTestId('screen-board', { includeHiddenElements: true }).props.style).backgroundColor === color;
    expect(paints(lightTheme.hues.family.board)).toBe(true);
    expect(screen.queryAllByTestId('leaf-hole', { includeHiddenElements: true })).toHaveLength(0);
    expect(screen.getByText('Ana Souza')).toBeOnTheScreen();
    expect(screen.getByText('ana@exemplo.com')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Privacidade' })).toBeOnTheScreen();
    expect(screen.getByText('Leitura de documentos: no aparelho')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Exportar meus dados/ })).toBeOnTheScreen();
    expect(screen.queryByText('Carregar família de exemplo')).toBeNull();
  });

  it('demo: "Carregar família de exemplo" pede confirmação, mostra o carregamento e o sucesso', async () => {
    let finish: (v: { created: boolean }) => void = () => undefined;
    const seed = jest.fn(() => new Promise<{ created: boolean }>((resolve) => (finish = resolve)));
    await renderSettings(seed);
    await confirmDemo();

    expect(seed).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Carregando a família de exemplo…')).toBeOnTheScreen();
    finish({ created: true });
    expect(await screen.findByText('Família de exemplo carregada. Veja na aba Família.')).toBeOnTheScreen();
    await waitFor(() => expect(screen.queryByText('Carregar a família de exemplo?')).toBeNull());
  });

  it('demo: quando a família de exemplo já está carregada, diz isso', async () => {
    await renderSettings(async () => ({ created: false }));
    await confirmDemo();
    expect(await screen.findByText('A família de exemplo já está carregada.')).toBeOnTheScreen();
  });

  it('demo: erro fecha a confirmação e mostra a mensagem', async () => {
    await renderSettings(() => Promise.reject(new Error('disco cheio')));
    await confirmDemo();
    expect(await screen.findByText('Não foi possível carregar a família de exemplo. Tente de novo.')).toBeOnTheScreen();
    await waitFor(() => expect(screen.queryByText('Carregar a família de exemplo?')).toBeNull());
  });

  it('demo: cancelar não carrega nada', async () => {
    const seed = jest.fn(async () => ({ created: true }));
    await renderSettings(seed);
    await fireEvent.press(screen.getByRole('button', { name: 'Carregar família de exemplo' }));
    await activate(within(await screen.findByTestId('demo-family-sheet')).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByText('Carregar a família de exemplo?')).toBeNull());
    expect(seed).not.toHaveBeenCalled();
  });
});
