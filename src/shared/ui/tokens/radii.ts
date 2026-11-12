/**
 * Raios v3 (cantos contínuos): contêiner grande e cartão de tendência 20, grupo/cartão 16, campo 12,
 * tile de ícone 10, trilho da régua 2, controles em cápsula. Chaves v1 (xs…xl, full) continuam.
 */
export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  /** Contêiner grande e cartão de tendência. */
  container: 20,
  /** Grupos (ListSection, SummaryCard) e cartões. */
  card: 16,
  /** Campos de texto preenchidos (não cápsula: o texto precisa de canto para respirar). */
  field: 12,
  /** Tile de ícone 36 × 36 pt. */
  tile: 10,
  /** Trilho da régua do laudo e da barra de progresso. */
  bar: 2,
  /** Botões, chips, pílulas, FAB: cápsula. */
  control: 999,
  /** v4: canto superior direito da folha sobre a divisória. */
  leaf: 16,
  /** v4: ponta da aba na régua e da marca de aba. */
  tab: 8,
  /** Topo de BottomSheet (o sistema aplica o seu no iOS). */
  sheet: 34,
  full: 999,
} as const;
export type RadiusKey = keyof typeof radii;

/** Raio interno concêntrico: `concentric(radii.container, 4)` = 16. */
export function concentric(outer: number, inset: number): number {
  return Math.max(0, outer - inset);
}
