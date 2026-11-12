import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createLocalConsentRepository } from '@/entities/consent';
import { DEMO_OTP_CODE, createLocalAuthGateway } from '@/entities/session';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { ThemeProvider } from '@/shared/ui';
import { ConsentScreen, TERMS_V2_PARAGRAPH, type ConsentFlow } from './ConsentScreen';

jest.mock('expo-router', () => ({ Stack: { Screen: () => null } }));

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const activate = (el: Parameters<typeof fireEvent>[0]) => fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

function setup() {
  const db = createMemoryDb();
  const auth = createLocalAuthGateway(db);
  const consents = createLocalConsentRepository(db);
  const flow: ConsentFlow = { mutate: jest.fn(), isPending: false, error: null };
  const show = async () => {
    const { wrapper: Deps, queryClient } = renderWithDependencies({ auth, consents });
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ThemeProvider scheme="light" reducedMotion>
          <Deps>
            <ConsentScreen flow={flow} />
          </Deps>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    // Sessão e consentimentos carregam em sequência: espera tudo assentar antes de afirmar o título.
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  };
  return { auth, consents, flow, show };
}

describe('ConsentScreen (spec P1, termo 2026-11-v2)', () => {
  it('mostra o parágrafo do termo v2 com o texto exato da spec', async () => {
    const { show } = setup();
    await show();
    expect(
      await screen.findByText(
        'Além dos documentos, o app organiza valores de exames, vacinas, medicamentos e sinais vitais que você registrar ou confirmar. A leitura do texto dos documentos é feita no próprio aparelho: o texto lido não é enviado nem guardado, e só os dados que você confirmar são salvos. O calendário público de vacinação é usado apenas como referência.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText(TERMS_V2_PARAGRAPH)).toBeOnTheScreen();
  });

  it('primeiro aceite: "Antes de começar"; o botão só aceita com as duas caixas, cada uma explícita', async () => {
    const { show, flow } = setup();
    await show();
    expect(await screen.findByRole('header', { name: 'Antes de começar' })).toBeOnTheScreen();
    expect(screen.getByText('Marque as duas opções para continuar.')).toBeOnTheScreen();
    const accept = screen.getByRole('button', { name: 'Aceitar e continuar' });
    expect(accept).toBeDisabled();

    await fireEvent.press(screen.getByRole('checkbox', { name: /Termos de Uso/ }));
    expect(accept).toBeDisabled();
    await fireEvent.press(screen.getByRole('checkbox', { name: /dados de saúde/ }));
    expect(screen.queryByText('Marque as duas opções para continuar.')).toBeNull();

    await activate(screen.getByRole('button', { name: 'Aceitar e continuar' }));
    expect(flow.mutate).toHaveBeenCalledWith({ termsAndPrivacy: true, healthData: true });
  });

  it('com sessão e aceite vigente da versão anterior (2026-11-v1): título "Termo atualizado"', async () => {
    const { show, auth, consents } = setup();
    await auth.verifyEmailOtp('ana@exemplo.com', DEMO_OTP_CODE);
    await consents.accept('terms_and_privacy', '2026-11-v1');
    await consents.accept('health_data_processing', '2026-11-v1');
    await show();
    expect(await screen.findByRole('header', { name: 'Termo atualizado' })).toBeOnTheScreen();
  });

  it('com sessão e consentimento revogado (BUG-09): continua "Antes de começar"', async () => {
    const { show, auth, consents } = setup();
    await auth.verifyEmailOtp('ana@exemplo.com', DEMO_OTP_CODE);
    await consents.accept('terms_and_privacy', '2026-11-v1');
    await consents.revoke('terms_and_privacy');
    await show();
    expect(await screen.findByRole('header', { name: 'Antes de começar' })).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Termo atualizado' })).toBeNull();
  });
});
