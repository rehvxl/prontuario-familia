import { Platform } from 'react-native';
import { backOrReplace } from './backOrReplace';

const origin = { pathname: '/(main)/member/[id]/emergency', params: { id: 'ana' } };

function router(canGoBack: boolean) {
  return { canGoBack: () => canGoBack, back: jest.fn(), replace: jest.fn() };
}

function setOs(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

describe('backOrReplace', () => {
  const os = Platform.OS;

  afterEach(() => setOs(os));

  it('com histórico, volta', () => {
    setOs('web');
    const navigation = router(true);
    backOrReplace(navigation, origin);
    expect(navigation.back).toHaveBeenCalledTimes(1);
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('na web sem histórico, substitui pela rota de origem', () => {
    setOs('web');
    const navigation = router(false);
    backOrReplace(navigation, origin);
    expect(navigation.replace).toHaveBeenCalledWith(origin);
    expect(navigation.back).not.toHaveBeenCalled();
  });

  it.each(['ios', 'android'] as const)('no %s sem histórico, continua voltando', (platform) => {
    setOs(platform);
    const navigation = router(false);
    backOrReplace(navigation, origin);
    expect(navigation.back).toHaveBeenCalledTimes(1);
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
