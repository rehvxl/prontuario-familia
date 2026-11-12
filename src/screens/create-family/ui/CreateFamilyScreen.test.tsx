import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createLocalFamilyRepository } from '@/entities/family';
import { DEMO_OTP_CODE, createLocalAuthGateway } from '@/entities/session';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { ThemeProvider } from '@/shared/ui';
import { CreateFamilyScreen } from './CreateFamilyScreen';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => ({ replace: mockReplace }) }));

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const activate = (el: Parameters<typeof fireEvent>[0]) => fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

describe('CreateFamilyScreen (DESIGN_SYSTEM.md §7.13)', () => {
  it('título, exemplo "Família Souza" no campo e, ao criar, segue para as pessoas', async () => {
    const db = createMemoryDb();
    const auth = createLocalAuthGateway(db);
    await auth.verifyEmailOtp('ana@exemplo.com', DEMO_OTP_CODE);
    const { wrapper: Deps } = renderWithDependencies({ auth, families: createLocalFamilyRepository(db) });
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ThemeProvider scheme="light" reducedMotion>
          <Deps>
            <CreateFamilyScreen />
          </Deps>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(screen.getByRole('header', { name: 'Como se chama a sua família?' })).toBeOnTheScreen();
    const input = screen.getByTestId('family-name-input');
    expect(input.props.placeholder).toBe('Família Souza');
    expect(screen.getByRole('button', { name: 'Criar família' })).toBeDisabled();
    // v4: rotular a capa. A etiqueta mostra o exemplo até digitar e depois o nome, fora do leitor de tela.
    const cover = screen.getByTestId('family-cover-preview', { includeHiddenElements: true });
    expect(cover.props.accessibilityElementsHidden).toBe(true);
    expect(cover).toHaveTextContent('Família Souza');
    await fireEvent.changeText(input, 'Souza');
    expect(cover).toHaveTextContent('Souza');
    expect(cover).not.toHaveTextContent('Família Souza');
    await activate(screen.getByRole('button', { name: 'Criar família' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(setup)/members'));
  });
});
