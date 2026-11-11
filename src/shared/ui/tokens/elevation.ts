import { Platform, type ViewStyle } from 'react-native';
import type { ColorScheme } from './colors';

/**
 * Elevação. Declarada uma vez por nível: no claro, sombra suave com deslocamento (sem borda);
 * no escuro, sombra não aparece, então a elevação vem do tom da superfície (surfaceRaised) e de um
 * contorno fino. Nunca borda + sombra larga ao mesmo tempo.
 */
export type ElevationLevel = 0 | 1 | 2 | 3;

const lightShadow = (level: ElevationLevel): ViewStyle => {
  if (level === 0) return {};
  const y = [0, 1, 4, 10][level] ?? 0;
  const blur = [0, 3, 12, 24][level] ?? 0;
  const opacity = [0, 0.08, 0.1, 0.14][level] ?? 0;
  return Platform.select<ViewStyle>({
    ios: { shadowColor: '#1B1F2A', shadowOffset: { width: 0, height: y }, shadowOpacity: opacity, shadowRadius: blur / 2 },
    android: { elevation: [0, 1, 3, 6][level] ?? 0, shadowColor: '#1B1F2A' },
    default: { boxShadow: `0 ${y}px ${blur}px rgba(27, 31, 42, ${opacity})` },
  }) as ViewStyle;
};

export function elevationStyle(scheme: ColorScheme, level: ElevationLevel, borderColor: string): ViewStyle {
  if (scheme === 'light') return lightShadow(level);
  if (level === 0) return {};
  return { borderWidth: 1, borderColor };
}
