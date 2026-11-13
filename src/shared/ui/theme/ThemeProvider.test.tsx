import type { ReactNode } from 'react';
import { AccessibilityInfo, Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from './ThemeProvider';

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
  const motion = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled');
  const transparency = jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled');

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
