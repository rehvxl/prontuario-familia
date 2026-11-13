import { Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import EmergencyConsentRoute from './emergency-consent';

const mockRouter = { replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
let mockParams: Record<string, string> = { memberId: 'ana' };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/application', () => ({
  useConsentFlow: () => ({ mutate: jest.fn(), isPending: false, error: null }),
}));

jest.mock('@/screens/emergency-consent', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    EmergencyConsentScreen: ({ onDecline }: { onDecline: () => void }) =>
      React.createElement(Pressable, { accessibilityRole: 'button', accessibilityLabel: 'Agora não', onPress: onDecline }, React.createElement(Text, null, 'Agora não')),
  };
});

function setOs(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

describe('fechar o termo da ficha', () => {
  const os = Platform.OS;

  beforeEach(() => {
    mockParams = { memberId: 'ana' };
    mockRouter.back.mockClear();
    mockRouter.replace.mockClear();
    mockRouter.canGoBack.mockReturnValue(true);
    setOs('web');
  });

  afterEach(() => setOs(os));

  it('com histórico, Agora não volta', async () => {
    await render(<EmergencyConsentRoute />);
    await fireEvent.press(screen.getByRole('button', { name: 'Agora não' }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('na web sem histórico, Agora não abre o resumo da pessoa sem empilhar', async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    await render(<EmergencyConsentRoute />);
    await fireEvent.press(screen.getByRole('button', { name: 'Agora não' }));
    expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/(main)/(tabs)/(family)', params: { member: 'ana' } });
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('na web sem histórico e sem pessoa, Agora não abre a família', async () => {
    mockParams = {};
    mockRouter.canGoBack.mockReturnValue(false);
    await render(<EmergencyConsentRoute />);
    await fireEvent.press(screen.getByRole('button', { name: 'Agora não' }));
    expect(mockRouter.replace).toHaveBeenCalledWith('/(main)/(tabs)/(family)');
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});
