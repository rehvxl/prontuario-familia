import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { ThemeProvider, useTheme } from './ThemeProvider';

type Reader = () => Promise<boolean>;

const info = AccessibilityInfo as Omit<typeof AccessibilityInfo, 'isReduceMotionEnabled' | 'isReduceTransparencyEnabled'> & {
  isReduceMotionEnabled: Reader;
  isReduceTransparencyEnabled?: Reader;
};

function themeWrapper(props: { glassAvailable?: boolean; reducedMotion?: boolean }) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider scheme="light" {...props}>
        {children}
      </ThemeProvider>
    );
  };
}

describe('ThemeProvider: reduzir transparência', () => {
  const originalTransparency = info.isReduceTransparencyEnabled;
  const originalMotion = info.isReduceMotionEnabled;

  afterEach(() => {
    info.isReduceTransparencyEnabled = originalTransparency;
    info.isReduceMotionEnabled = originalMotion;
  });

  it('sem isReduceTransparencyEnabled (react-native-web) não quebra e não reduz a transparência', async () => {
    info.isReduceTransparencyEnabled = undefined;
    const motion = jest.fn((...args: Parameters<Reader>) => originalMotion.apply(AccessibilityInfo, args));
    info.isReduceMotionEnabled = motion;

    const { result } = await renderHook(() => useTheme(), {
      wrapper: themeWrapper({ glassAvailable: true }),
    });

    expect(result.current.glass.reduceTransparency).toBe(false);
    expect(result.current.glass.enabled).toBe(true);
    expect(motion).toHaveBeenCalled();
  });

  it('com a API presente, continua usando o valor do sistema', async () => {
    info.isReduceTransparencyEnabled = () => Promise.resolve(true);

    const { result } = await renderHook(() => useTheme(), {
      wrapper: themeWrapper({ glassAvailable: true, reducedMotion: false }),
    });

    await waitFor(() => expect(result.current.glass.reduceTransparency).toBe(true));
    expect(result.current.glass.enabled).toBe(false);
  });
});
