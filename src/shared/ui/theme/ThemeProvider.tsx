import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';
import { isGlassEffectAPIAvailable } from 'expo-glass-effect';
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
  /** Força "reduzir transparência" (testes/catálogo). Por padrão lê a configuração do sistema. */
  reduceTransparency?: boolean;
  /** Força a disponibilidade do Liquid Glass (testes). Por padrão `isGlassEffectAPIAvailable()`. */
  glassAvailable?: boolean;
}

export function ThemeProvider({
  children,
  scheme = 'system',
  reducedMotion,
  reduceTransparency,
  glassAvailable,
}: ThemeProviderProps) {
  const system = useColorScheme();
  const systemReduced = useAccessibilityFlag('reduceMotion', reducedMotion === undefined);
  const systemTransparency = useAccessibilityFlag('reduceTransparency', reduceTransparency === undefined);
  const resolved: ColorScheme = scheme === 'system' ? (system === 'dark' ? 'dark' : 'light') : scheme;
  const reduced = reducedMotion ?? systemReduced;
  const transparency = reduceTransparency ?? systemTransparency;
  const available = glassAvailable ?? safeGlassAvailable();
  const theme = useMemo(
    () => createTheme(resolved, { reducedMotion: reduced, reduceTransparency: transparency, glassAvailable: available }),
    [resolved, reduced, transparency, available],
  );
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

function safeGlassAvailable(): boolean {
  try {
    return isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
}

type AccessibilityFlag = 'reduceMotion' | 'reduceTransparency';

function useAccessibilityFlag(flag: AccessibilityFlag, enabled: boolean): boolean {
  const [value, setValue] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const read =
      flag === 'reduceMotion' ? AccessibilityInfo.isReduceMotionEnabled : AccessibilityInfo.isReduceTransparencyEnabled;
    read()
      .then((v) => {
        if (active) setValue(v);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener(
      flag === 'reduceMotion' ? 'reduceMotionChanged' : 'reduceTransparencyChanged',
      setValue,
    );
    return () => {
      active = false;
      sub.remove();
    };
  }, [enabled, flag]);
  return value;
}
