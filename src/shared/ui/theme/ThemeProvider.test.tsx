import { act, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AccessibilityInfo, Text } from 'react-native';
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

  it('se a leitura rejeita, não quebra e não reduz a transparência', async () => {
    info.isReduceTransparencyEnabled = () => Promise.reject(new Error('indisponível'));

    const { result } = await renderHook(() => useTheme(), {
      wrapper: themeWrapper({ glassAvailable: true, reducedMotion: false }),
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.glass.reduceTransparency).toBe(false);
    expect(result.current.glass.enabled).toBe(true);
  });
});

/** O padrão é não reduzir movimento nem transparência. Com vidro disponível, ele continua ligado. */
function Reading() {
  const theme = useTheme();
  const motion = theme.motion.reduced ? 'movimento reduzido' : 'movimento padrão';
  const transparency = theme.glass.reduceTransparency ? 'transparência reduzida' : 'transparência padrão';
  const glass = theme.glass.enabled ? 'vidro ligado' : 'vidro desligado';
  return <Text>{`${motion}, ${transparency}, ${glass}`}</Text>;
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider scheme="light" glassAvailable>
      {children}
    </ThemeProvider>
  );
}

describe('ThemeProvider: leitura de acessibilidade rejeitada', () => {
  // Espiões criados por teste: o bloco acima reatribui as funções originais no afterEach.
  let motion: jest.SpyInstance;
  let transparency: jest.SpyInstance;

  beforeEach(() => {
    motion = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled');
    transparency = jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled');
  });

  afterEach(() => {
    motion.mockRestore();
    transparency.mockRestore();
  });

  it('cai no padrão sem quebrar e sem rejeição não tratada', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', onUnhandled);
    motion.mockRejectedValue(new Error('movimento'));
    transparency.mockRejectedValue(new Error('transparência'));

    try {
      await render(<Reading />, { wrapper });
      await act(async () => {
        await new Promise<void>((resolve) => {
          setImmediate(() => resolve());
        });
      });

      expect(motion).toHaveBeenCalled();
      expect(transparency).toHaveBeenCalled();
      expect(screen.getByText('movimento padrão, transparência padrão, vidro ligado')).toBeOnTheScreen();
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });
});
