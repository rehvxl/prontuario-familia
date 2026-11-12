import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DEMO_OTP_CODE, createLocalAuthGateway, type AuthGateway, type AuthProvider } from '@/entities/session';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { ThemeProvider } from '@/shared/ui';
import { SignInScreen } from './SignInScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const activate = (el: Parameters<typeof fireEvent>[0]) => fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

async function show({ demo = false, providers }: { demo?: boolean; providers?: AuthProvider[] } = {}) {
  const local = createLocalAuthGateway(createMemoryDb());
  const auth: AuthGateway = { ...local, availableProviders: async () => providers ?? (await local.availableProviders()) };
  const signInWithGoogle = jest.spyOn(auth, 'signInWithGoogle');
  const { wrapper: Deps, queryClient } = renderWithDependencies({ auth });
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ThemeProvider scheme="light" reducedMotion>
        <Deps>
          <SignInScreen demo={demo} />
        </Deps>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  return { signInWithGoogle };
}

beforeEach(() => mockPush.mockClear());

describe('SignInScreen (DESIGN_SYSTEM.md §7.13)', () => {
  it('título "Entrar", campo de e-mail e "Enviar código" desabilitado até digitar', async () => {
    await show();
    expect(screen.getByRole('header', { name: 'Entrar' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Enviar código' })).toBeDisabled();
    expect(screen.queryByTestId('demo-banner')).toBeNull();
  });

  it('modo demo: selo discreto com o código de teste', async () => {
    await show({ demo: true });
    expect(screen.getByTestId('demo-banner')).toHaveTextContent(`Modo demonstração · código ${DEMO_OTP_CODE}`);
  });

  it('envia o código e leva à verificação com o e-mail normalizado', async () => {
    await show();
    await fireEvent.changeText(screen.getByTestId('email-input'), '  Ana@Exemplo.com ');
    await activate(screen.getByRole('button', { name: 'Enviar código' }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith({ pathname: '/(auth)/verify', params: { email: 'ana@exemplo.com' } }));
  });

  it('Google pelo botão de marca, com nome acessível, aciona o login do Google', async () => {
    const { signInWithGoogle } = await show({ providers: ['google'] });
    const google = await screen.findByRole('button', { name: 'Continuar com o Google' });
    await fireEvent.press(google);
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledTimes(1));
    expect(screen.getByText('ou continue com')).toBeOnTheScreen();
  });

  it('sem provedores sociais, a seção "ou continue com" some', async () => {
    await show({ providers: [] });
    expect(screen.queryByText('ou continue com')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Continuar com o Google' })).toBeNull();
  });
});
