import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DEMO_OTP_CODE, createLocalAuthGateway } from '@/entities/session';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { ThemeProvider } from '@/shared/ui';
import { VerifyCodeScreen, formatCountdown } from './VerifyCodeScreen';

jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useLocalSearchParams: () => ({ email: 'ana@exemplo.com' }) }));

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

async function show(demo = false) {
  const { wrapper: Deps } = renderWithDependencies({ auth: createLocalAuthGateway(createMemoryDb()) });
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ThemeProvider scheme="light" reducedMotion>
        <Deps>
          <VerifyCodeScreen demo={demo} />
        </Deps>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('VerifyCodeScreen (DESIGN_SYSTEM.md §7.13)', () => {
  it('formata a contagem do reenvio em minutos e segundos', () => {
    expect(formatCountdown(60)).toBe('1:00');
    expect(formatCountdown(42)).toBe('0:42');
    expect(formatCountdown(5)).toBe('0:05');
  });

  it('título, e-mail no texto e "Reenviar em 1:00" desabilitado, lido por extenso', async () => {
    await show();
    expect(screen.getByRole('header', { name: 'Digite o código' })).toBeOnTheScreen();
    expect(screen.getByText('Enviamos um código de 6 dígitos para ana@exemplo.com.')).toBeOnTheScreen();
    const resend = screen.getByTestId('resend-button');
    expect(resend).toHaveAccessibleName('Reenviar código em 60 segundos');
    expect(resend).toBeDisabled();
    expect(screen.queryByTestId('demo-banner')).toBeNull();
  });

  it('modo demo: selo com o código de teste', async () => {
    await show(true);
    expect(screen.getByTestId('demo-banner')).toHaveTextContent(`Modo demonstração · código ${DEMO_OTP_CODE}`);
  });

  it('código errado mostra o erro no campo', async () => {
    await show();
    await fireEvent.changeText(screen.getByTestId('otp-input'), '000000');
    await waitFor(() => expect(screen.getByText(/Código inválido ou expirado/)).toBeOnTheScreen());
  });
});
