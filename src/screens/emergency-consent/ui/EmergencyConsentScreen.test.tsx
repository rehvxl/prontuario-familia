import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LGPD_LAW_URL, TERMS_V2_PARAGRAPH, createLocalConsentRepository } from '@/entities/consent';
import { createLocalAuthGateway } from '@/entities/session';
import { DEPENDENCY_KEYS } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { ThemeProvider } from '@/shared/ui';
import { EmergencyConsentScreen, type EmergencyConsentFlow } from './EmergencyConsentScreen';

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useNavigation: () => ({ addListener: () => () => undefined }),
}));

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const activate = (el: Parameters<typeof fireEvent>[0]) => fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

async function setup(flowOver: Partial<EmergencyConsentFlow> = {}) {
  const db = createMemoryDb();
  const auth = createLocalAuthGateway(db);
  await auth.verifyEmailOtp('ana@exemplo.com', '123456');
  const consents = createLocalConsentRepository(db);
  await consents.accept('terms_and_privacy', '2026-11-v2');
  await consents.accept('health_data_processing', '2026-11-v2');
  const revoke = jest.spyOn(consents, 'revoke');
  const flow: EmergencyConsentFlow = { mutate: jest.fn(), isPending: false, error: null, ...flowOver };
  const onDecline = jest.fn();
  const onAccepted = jest.fn();
  const { wrapper: Deps } = renderWithDependencies({ [DEPENDENCY_KEYS.consents]: consents });
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ThemeProvider scheme="light" reducedMotion>
        <Deps>
          <EmergencyConsentScreen flow={flow} onDecline={onDecline} onAccepted={onAccepted} />
        </Deps>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  await screen.findByText('O que mudou');
  return { flow, onDecline, onAccepted, revoke, consents };
}

beforeEach(() => {
  onlineManager.setOnline(true);
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
});

afterEach(() => {
  onlineManager.setOnline(true);
  jest.restoreAllMocks();
});

describe('EmergencyConsentScreen (reaceite v3)', () => {
  it('destaca o adendo, esconde o texto integral e aponta a lei no Planalto', async () => {
    await setup();
    expect(screen.getByRole('header', { name: 'Termo atualizado' })).toBeOnTheScreen();
    expect(screen.getByText(/que o termo anterior não cobria/)).toBeOnTheScreen();
    const addendum = screen.getByTestId('terms-v3-addendum');
    expect(addendum).toHaveTextContent(/alergias/);
    expect(addendum).toHaveTextContent(/tipo sanguíneo/);
    expect(addendum).toHaveTextContent(/condições de saúde/);
    expect(addendum).toHaveTextContent(/contatos de emergência/);
    expect(addendum).toHaveTextContent(/profissional de saúde/);
    expect(screen.queryByTestId('terms-full')).toBeNull();
    expect(screen.queryByText('O que mudou')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Ver o texto completo do termo' }));
    expect(screen.getByTestId('terms-full')).toHaveTextContent(/Além dos documentos, o app organiza valores de exames/);
    expect(screen.getByText(TERMS_V2_PARAGRAPH)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ocultar o texto completo do termo' })).toHaveProp('accessibilityState', { expanded: true });

    await fireEvent.press(screen.getAllByRole('link', { name: 'Lei nº 13.709/2018 (LGPD)' })[0]!);
    expect(Linking.openURL).toHaveBeenCalledWith(LGPD_LAW_URL);
  });

  it('Agora não não revoga a v2, não grava aceite e volta', async () => {
    const { flow, onDecline, revoke, consents } = await setup();
    expect(screen.getByRole('button', { name: 'Aceitar e continuar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Agora não' })).not.toBeDisabled();
    expect(screen.queryByText('Sair sem salvar?')).toBeNull();

    await activate(screen.getByRole('button', { name: 'Agora não' }));
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(flow.mutate).not.toHaveBeenCalled();
    expect(revoke).not.toHaveBeenCalled();
    const stored = await consents.listMine();
    expect(stored.every((c) => c.version === '2026-11-v2' && c.revokedAt === null)).toBe(true);
  });

  it('fechar pelo cabeçalho tem o mesmo efeito e não chama revoke', async () => {
    const { onDecline, revoke } = await setup();
    await fireEvent.press(screen.getByLabelText('Agora não. Fecha sem aceitar.'));
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(revoke).not.toHaveBeenCalled();
  });

  it('aceitar só com as duas caixas e, sem rede, permanece desabilitado', async () => {
    const { flow } = await setup();
    await fireEvent.press(screen.getByRole('checkbox', { name: /Termos de Uso/ }));
    await fireEvent.press(screen.getByRole('checkbox', { name: /dados de saúde/ }));
    await activate(screen.getByRole('button', { name: 'Aceitar e continuar' }));
    expect(flow.mutate).toHaveBeenCalledWith({ termsAndPrivacy: true, healthData: true });

    await act(async () => {
      onlineManager.setOnline(false);
    });
    await waitFor(() => expect(screen.getByText(/Sem conexão: é preciso estar conectado para aceitar o termo/)).toBeOnTheScreen());
    expect(screen.getByRole('button', { name: 'Aceitar e continuar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Agora não' })).not.toBeDisabled();
  });

  it('enquanto grava, Agora não e fechar ficam desabilitados', async () => {
    await setup({ isPending: true });
    expect(screen.getByRole('button', { name: 'Agora não' })).toBeDisabled();
    expect(screen.getByLabelText('Agora não. Fecha sem aceitar.')).toBeDisabled();
  });
});
