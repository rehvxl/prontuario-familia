/** Raios. Cartões ficam entre 12 e 16; pílula só para controles pequenos (chips, badges). */
export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;
export type RadiusKey = keyof typeof radii;
