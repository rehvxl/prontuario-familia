import { Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import EditEmergencyCardRoute from './edit';

const mockRouter = { replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
let mockParams: Record<string, string> = { memberId: 'ana' };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/screens/edit-emergency-card', () => ({ EditEmergencyCardScreen: () => null }));

jest.mock('@/shared/ui/navigation', () => {
  const actual = jest.requireActual<typeof import('@/shared/ui/navigation')>('@/shared/ui/navigation');
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    ...actual,
    SheetCloseButton: ({ onPress }: { onPress?: () => void }) =>
      React.createElement(Pressable, { accessibilityRole: 'button', accessibilityLabel: 'Fechar', onPress }, React.createElement(Text, null, 'Fechar')),
  };
});

function setOs(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

describe('fechar a edição da ficha', () => {
  const os = Platform.OS;

  beforeEach(() => {
    mockParams = { memberId: 'ana' };
    mockRouter.back.mockClear();
    mockRouter.replace.mockClear();
    mockRouter.canGoBack.mockReturnValue(true);
    setOs('web');
  });

  afterEach(() => setOs(os));

  it('com histórico, Fechar volta', async () => {
    await render(<EditEmergencyCardRoute />);
    await fireEvent.press(screen.getByRole('button', { name: 'Fechar' }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('na web sem histórico, Fechar abre a leitura da mesma pessoa sem empilhar', async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    await render(<EditEmergencyCardRoute />);
    await fireEvent.press(screen.getByRole('button', { name: 'Fechar' }));
    expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/(main)/member/[id]/emergency', params: { id: 'ana' } });
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});
