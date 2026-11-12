import { Platform, type ViewStyle } from 'react-native';
import type { ColorScheme } from './colors';

/**
 * Elevação v3/v4. Um elemento declara profundidade uma vez: fio (conteúdo) ou sombra (flutuante).
 * - 0 e 1: conteúdo plano com fio de 1 pt (`border`), nos dois temas. Sem sombra.
 * - 2: "Flutuante" (FAB, banner flutuante), sombra sem fio. No escuro, nada: o tom já destaca.
 * - 3: folha/sheet. Sombra no claro (elevation 3 no Android); fio no escuro.
 */
export type ElevationLevel = 0 | 1 | 2 | 3;

/** Sombra "Flutuante" v4 (duas camadas, na tinta azulada #141946). */
const floating: ViewStyle = Platform.select<ViewStyle>({
  android: { elevation: 3, shadowColor: '#141946' },
  default: { boxShadow: '0 6px 16px rgba(20, 25, 70, 0.24), 0 1px 3px rgba(20, 25, 70, 0.2)' },
}) as ViewStyle;

export function elevationStyle(scheme: ColorScheme, level: ElevationLevel, borderColor: string): ViewStyle {
  const hairline: ViewStyle = { borderWidth: 1, borderColor };
  if (level <= 1) return hairline;
  if (scheme === 'dark') return level === 3 ? hairline : {};
  return floating;
}
