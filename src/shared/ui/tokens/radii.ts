/**
 * Raios concêntricos (v2). No iOS 26 os cantos acompanham o aparelho: o raio de dentro é o de fora
 * menos o espaçamento. container 26 → card 20 (6 pt de respiro) → controle em cápsula.
 * Chaves v1 (xs…xl, full) continuam para compatibilidade.
 */
export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  /** Seções de lista agrupada, folhas e superfícies grandes. */
  container: 26,
  /** Cartões dentro de um container ou soltos na tela. */
  card: 20,
  /** Campos de texto preenchidos (não cápsula: o texto precisa de canto para respirar). */
  field: 14,
  /** Botões, chips, pílulas, FAB: cápsula. */
  control: 999,
  /** Topo de BottomSheet (o sistema aplica o seu no iOS). */
  sheet: 34,
  full: 999,
} as const;
export type RadiusKey = keyof typeof radii;

/** Raio interno concêntrico: `concentric(radii.container, 6)` = 20. */
export function concentric(outer: number, inset: number): number {
  return Math.max(0, outer - inset);
}
