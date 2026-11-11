import { Platform } from 'react-native';
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
  typography,
} from '../tokens';

export interface Theme {
  scheme: ColorScheme;
  colors: ColorTokens;
  categorical: readonly CategoricalColor[];
  typography: typeof typography;
  space: typeof space;
  layout: typeof layout;
  radii: typeof radii;
  elevation: (level: ElevationLevel) => ReturnType<typeof elevationStyle>;
  motion: { duration: typeof duration; easing: typeof easing; /** "Reduzir movimento" do sistema. */ reduced: boolean };
  /** Área mínima de toque: 44 pt (iOS) / 48 dp (Android). */
  minTouchTarget: number;
}

export function createTheme(scheme: ColorScheme, options: { reducedMotion?: boolean } = {}): Theme {
  const { colors, categorical } = palettes[scheme];
  return {
    scheme,
    colors,
    categorical,
    typography,
    space,
    layout,
    radii,
    elevation: (level) => elevationStyle(scheme, level, colors.border),
    motion: { duration, easing, reduced: options.reducedMotion ?? false },
    minTouchTarget: Platform.OS === 'android' ? 48 : 44,
  };
}

export const lightTheme = createTheme('light');
export const darkTheme = createTheme('dark');

/**
 * Opções de cabeçalho para o Stack/Tabs do expo-router, sem acoplar shared/ui à navegação:
 * `<Stack screenOptions={headerOptions(theme)} />`.
 */
export function headerOptions(theme: Theme) {
  return {
    headerStyle: { backgroundColor: theme.colors.background },
    headerTintColor: theme.colors.primary,
    headerTitleStyle: { color: theme.colors.textPrimary, fontWeight: '600' as const },
    headerLargeTitleStyle: { color: theme.colors.textPrimary },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: theme.colors.background },
  };
}
