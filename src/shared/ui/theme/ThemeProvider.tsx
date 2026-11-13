import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';
import { isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ARCHIVO, type ColorScheme, type HueName, type HueTokens } from '../tokens';
import { createTheme, onLeaf, withHue, type Theme } from './theme';

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
  /** A Archivo está disponível. Padrão true (o build embute as fontes pelo plugin do expo-font). */
  fontsLoaded?: boolean;
}

export function ThemeProvider({
  children,
  scheme = 'system',
  reducedMotion,
  reduceTransparency,
  glassAvailable,
  fontsLoaded = true,
}: ThemeProviderProps) {
  const system = useColorScheme();
  const systemReduced = useAccessibilityFlag('reduceMotion', reducedMotion === undefined);
  const systemTransparency = useAccessibilityFlag('reduceTransparency', reduceTransparency === undefined);
  const resolved: ColorScheme = scheme === 'system' ? (system === 'dark' ? 'dark' : 'light') : scheme;
  const reduced = reducedMotion ?? systemReduced;
  const transparency = reduceTransparency ?? systemTransparency;
  const available = glassAvailable ?? safeGlassAvailable();
  const theme = useMemo(
    () => createTheme(resolved, { reducedMotion: reduced, reduceTransparency: transparency, glassAvailable: available, fontsLoaded }),
    [resolved, reduced, transparency, available, fontsLoaded],
  );
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** Tema atual. Precisa de <ThemeProvider> (ou <UiProvider>) acima na árvore. */
export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme: envolva o app em <UiProvider> ou <ThemeProvider> (src/shared/ui).');
  return theme;
}

export interface HueProviderProps {
  /** A divisória (nome do matiz ou tokens de `theme.personBoard(i)`). */
  hue: HueName | HueTokens;
  /** v4: os filhos estão na folha (`Leaf`): `colors.background` vira `hue.leaf`. */
  leaf?: boolean;
  children: ReactNode;
}

/**
 * v4: tudo abaixo passa a usar a tinta da divisória `hue` (`theme.hue`, `colors.primary*`, `focusRing`,
 * `rangeBand`): botão cheio, FAB, links, gráfico e a faixa do laudo ficam na cor da pessoa.
 * `DividerBoard` e `Screen board` já envolvem o conteúdo com ele.
 */
export function HueProvider({ hue, leaf = false, children }: HueProviderProps) {
  const theme = useTheme();
  const key = typeof hue === 'string' ? hue : hue.name;
  const value = useMemo(() => (leaf ? onLeaf(withHue(theme, key)) : withHue(theme, key)), [theme, key, leaf]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Os 4 cortes da Archivo SemiCondensed (OFL, assets/fonts/Archivo-OFL.txt). */
const FONT_MAP = {
  [ARCHIVO['400']]: require('../../../../assets/fonts/ArchivoSC-Regular.ttf'),
  [ARCHIVO['500']]: require('../../../../assets/fonts/ArchivoSC-Medium.ttf'),
  [ARCHIVO['600']]: require('../../../../assets/fonts/ArchivoSC-SemiBold.ttf'),
  [ARCHIVO['700']]: require('../../../../assets/fonts/ArchivoSC-Bold.ttf'),
};

/**
 * Providers de UI do app: safe area + tema. Coloque no _layout raiz.
 * Fontes: o build já embute a Archivo (plugin do expo-font no app.json), então `useFonts` responde "carregada"
 * na hora. No Expo Go, `useFonts` carrega em tempo de execução; até lá, e se falhar, o texto usa a fonte do
 * sistema. Nunca bloqueia a renderização.
 */
export function UiProvider({ children, fontsLoaded, ...themeProps }: ThemeProviderProps) {
  const [loaded] = useFonts(FONT_MAP);
  return (
    <SafeAreaProvider>
      <ThemeProvider {...themeProps} fontsLoaded={fontsLoaded ?? loaded}>
        {children}
      </ThemeProvider>
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

/**
 * Lê o ajuste de acessibilidade. `isReduceMotionEnabled` existe no react-native-web;
 * `isReduceTransparencyEnabled` não (o módulo só implementa movimento, leitor de tela e
 * `addEventListener`, que para `reduceTransparencyChanged` devolve uma inscrição vazia).
 * Chamar a função ausente quebra na hora (`read is not a function`) — o `.catch` não pega
 * TypeError síncrono. Sem a função, permanece false: não reduzir transparência.
 * iOS e Android têm as duas funções e continuam lendo o sistema.
 */
function accessibilityReader(flag: AccessibilityFlag): (() => Promise<boolean>) | undefined {
  const info = AccessibilityInfo as Partial<
    Pick<typeof AccessibilityInfo, 'isReduceMotionEnabled' | 'isReduceTransparencyEnabled'>
  >;
  const read = flag === 'reduceMotion' ? info.isReduceMotionEnabled : info.isReduceTransparencyEnabled;
  return typeof read === 'function' ? read : undefined;
}

function useAccessibilityFlag(flag: AccessibilityFlag, enabled: boolean): boolean {
  const [value, setValue] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const read = accessibilityReader(flag);
    if (read) {
      read()
        .then((v) => {
          if (active) setValue(v);
        })
        .catch(() => undefined);
    }
    const sub = AccessibilityInfo.addEventListener(
      flag === 'reduceMotion' ? 'reduceMotionChanged' : 'reduceTransparencyChanged',
      setValue,
    );
    return () => {
      active = false;
      // No web, `reduceMotionChanged` devolve undefined quando não há matchMedia.
      sub?.remove();
    };
  }, [enabled, flag]);
  return value;
}
