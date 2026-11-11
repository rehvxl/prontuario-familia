import { Platform, PlatformColor, type ColorValue } from 'react-native';
import {
  palettes,
  type CategoricalColor,
  type ColorScheme,
  type ColorTokens,
  type ElevationLevel,
  elevationStyle,
  duration,
  easing,
  layout,
  radii,
  space,
  spring,
  typography,
} from '../tokens';

/**
 * Cores do sistema para o que precisa acompanhar o aparelho em tempo real (fundo de tela, cabeçalho,
 * separadores, rótulos de células nativas). No iOS são PlatformColor (UIKit semantic colors, já
 * respondem a modo escuro, Aumentar Contraste e Liquid Glass). No Android e nos testes, os hex do tema.
 */
export interface NativeColors {
  background: ColorValue;
  groupedBackground: ColorValue;
  surface: ColorValue;
  label: ColorValue;
  secondaryLabel: ColorValue;
  separator: ColorValue;
  fill: ColorValue;
  tint: ColorValue;
}

/** Estado do Liquid Glass para esta sessão. `enabled` é o que os componentes devem usar. */
export interface GlassState {
  /** `isGlassEffectAPIAvailable()`: iOS 26+ com a API exposta. */
  available: boolean;
  /** Ajustes › Acessibilidade › Reduzir transparência. */
  reduceTransparency: boolean;
  /** available && !reduceTransparency. Quando false, use superfície sólida. */
  enabled: boolean;
}

export interface Theme {
  scheme: ColorScheme;
  colors: ColorTokens;
  categorical: readonly CategoricalColor[];
  /** Cores do sistema (PlatformColor no iOS). */
  native: NativeColors;
  typography: typeof typography;
  space: typeof space;
  layout: typeof layout;
  radii: typeof radii;
  elevation: (level: ElevationLevel) => ReturnType<typeof elevationStyle>;
  motion: {
    duration: typeof duration;
    easing: typeof easing;
    spring: typeof spring;
    /** "Reduzir movimento" do sistema. */
    reduced: boolean;
  };
  glass: GlassState;
  /** Área mínima de toque: 44 pt (iOS) / 48 dp (Android). */
  minTouchTarget: number;
}

export interface CreateThemeOptions {
  reducedMotion?: boolean;
  glassAvailable?: boolean;
  reduceTransparency?: boolean;
}

const isJest = typeof process !== 'undefined' && process.env?.JEST_WORKER_ID !== undefined;

function nativeColors(colors: ColorTokens): NativeColors {
  if (Platform.OS === 'ios' && !isJest) {
    return {
      background: PlatformColor('systemBackground'),
      groupedBackground: PlatformColor('systemGroupedBackground'),
      surface: PlatformColor('secondarySystemGroupedBackground'),
      label: PlatformColor('label'),
      secondaryLabel: PlatformColor('secondaryLabel'),
      separator: PlatformColor('separator'),
      fill: PlatformColor('tertiarySystemFill'),
      tint: colors.primary,
    };
  }
  return {
    background: colors.background,
    groupedBackground: colors.background,
    surface: colors.surface,
    label: colors.textPrimary,
    secondaryLabel: colors.textSecondary,
    separator: colors.border,
    fill: colors.surfaceSunken,
    tint: colors.primary,
  };
}

export function createTheme(scheme: ColorScheme, options: CreateThemeOptions = {}): Theme {
  const { colors, categorical } = palettes[scheme];
  const available = options.glassAvailable ?? false;
  const reduceTransparency = options.reduceTransparency ?? false;
  return {
    scheme,
    colors,
    categorical,
    native: nativeColors(colors),
    typography,
    space,
    layout,
    radii,
    elevation: (level) => elevationStyle(scheme, level, colors.border),
    motion: { duration, easing, spring, reduced: options.reducedMotion ?? false },
    glass: { available, reduceTransparency, enabled: available && !reduceTransparency },
    minTouchTarget: Platform.OS === 'android' ? 48 : 44,
  };
}

export const lightTheme = createTheme('light');
export const darkTheme = createTheme('dark');

export interface HeaderOptionsConfig {
  /**
   * Título grande (iOS) que encolhe ao rolar. Padrão true. Use false em telas modais ou de passo
   * (formulários de cadastro), onde o título pequeno centralizado é a convenção.
   */
  largeTitle?: boolean;
  /**
   * Cabeçalho transparente, o conteúdo passa por baixo e o sistema aplica o material (Liquid Glass
   * no iOS 26). Só ligue em telas cujo conteúdo rola com `contentInsetAdjustmentBehavior="automatic"`
   * (Screen com scroll, ou FlatList/SectionList com `nativeScrollProps`). Padrão false.
   */
  transparent?: boolean;
}

/**
 * Opções de cabeçalho para o Stack do expo-router, sem acoplar shared/ui à navegação:
 * `<Stack screenOptions={headerOptions(theme)} />`.
 *
 * iOS: título grande nativo, sem sombra, fundo do sistema; com `transparent`, Liquid Glass do sistema
 * (iOS 26) ou blur (iOS < 26). Os títulos (pequeno e grande) usam sempre a cor de texto do sistema
 * (`label`); o tint (`primary`) fica só nos botões. Atenção: no expo-router, `headerTintColor` sem cor
 * de título explícita pinta o título com o tint. Se sobrescrever `headerTintColor`, espalhe
 * `headerOptions` antes ou use `headerTitleColors(theme)` junto.
 * Android: top app bar do Material 3 (fundo da superfície, título 22 sp, sem sombra até rolar).
 */
export function headerOptions(theme: Theme, config: HeaderOptionsConfig = {}) {
  const { largeTitle = true, transparent = false } = config;
  if (Platform.OS === 'ios') {
    return {
      headerLargeTitle: largeTitle,
      headerLargeTitleShadowVisible: false,
      headerShadowVisible: false,
      headerTransparent: transparent,
      // No iOS 26 o sistema já aplica o Liquid Glass; blur junto gera o aviso de efeitos sobrepostos do RNScreens.
      headerBlurEffect: transparent && !theme.glass.available ? ('systemChromeMaterial' as const) : undefined,
      headerStyle: transparent ? undefined : { backgroundColor: theme.native.groupedBackground },
      headerLargeStyle: transparent ? undefined : { backgroundColor: theme.native.groupedBackground },
      headerTintColor: theme.colors.primary,
      ...headerTitleColors(theme),
      headerBackButtonDisplayMode: 'minimal' as const,
      contentStyle: { backgroundColor: theme.native.groupedBackground },
    };
  }
  return {
    headerShadowVisible: false,
    headerTransparent: false,
    headerStyle: { backgroundColor: theme.colors.background },
    headerTintColor: theme.colors.textPrimary,
    headerTitleStyle: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: '400' as const },
    headerTitleAlign: 'left' as const,
    contentStyle: { backgroundColor: theme.colors.background },
  };
}

/**
 * Cor do título do cabeçalho nativo: texto do sistema (`label` no iOS, que segue escuro e "Aumentar
 * contraste"; textPrimary no Android). Para layouts com `screenOptions` próprios que definem `headerTintColor`.
 */
export function headerTitleColors(theme: Theme) {
  const color = Platform.OS === 'ios' ? theme.native.label : theme.colors.textPrimary;
  return { headerTitleStyle: { color }, headerLargeTitleStyle: { color } };
}

/**
 * Props para FlatList/SectionList/ScrollView próprios ficarem corretos sob o cabeçalho nativo
 * (título grande, cabeçalho transparente e barra de abas flutuante do iOS 26).
 */
export const nativeScrollProps = {
  contentInsetAdjustmentBehavior: 'automatic' as const,
  automaticallyAdjustsScrollIndicatorInsets: true,
  keyboardDismissMode: 'interactive' as const,
};
