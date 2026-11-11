import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { ColorScheme } from '../tokens';
import { createTheme, type Theme } from './theme';

const ThemeContext = createContext<Theme | null>(null);

export type ThemePreference = ColorScheme | 'system';

export interface ThemeProviderProps {
  children: ReactNode;
  /** 'system' (padrão) segue o aparelho. Use 'light'/'dark' para uma preferência do usuário ou em testes. */
  scheme?: ThemePreference;
  /** Força "reduzir movimento" (testes). Por padrão lê a configuração do sistema. */
  reducedMotion?: boolean;
}

export function ThemeProvider({ children, scheme = 'system', reducedMotion }: ThemeProviderProps) {
  const system = useColorScheme();
  const systemReduced = useSystemReducedMotion(reducedMotion === undefined);
  const resolved: ColorScheme = scheme === 'system' ? (system === 'dark' ? 'dark' : 'light') : scheme;
  const reduced = reducedMotion ?? systemReduced;
  const theme = useMemo(() => createTheme(resolved, { reducedMotion: reduced }), [resolved, reduced]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** Tema atual. Precisa de <ThemeProvider> (ou <UiProvider>) acima na árvore. */
export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme: envolva o app em <UiProvider> ou <ThemeProvider> (src/shared/ui).');
  return theme;
}

/** Providers de UI do app: safe area + tema. Coloque no _layout raiz. */
export function UiProvider({ children, ...themeProps }: ThemeProviderProps) {
  return (
    <SafeAreaProvider>
      <ThemeProvider {...themeProps}>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

function useSystemReducedMotion(enabled: boolean): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      sub.remove();
    };
  }, [enabled]);
  return reduced;
}
