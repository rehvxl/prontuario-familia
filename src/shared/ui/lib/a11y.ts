import { useWindowDimensions } from 'react-native';

/** Multiplicador de fonte do iOS AX3 (≈ 2,35×). Daqui para cima, o que fica lado a lado empilha. */
export const STACK_FONT_SCALE = 2.35;

/** true em AX3+ (DESIGN.md › Typography): linhas de métrica, tiles e ações empilham. */
export function useStackedLayout(): boolean {
  return useWindowDimensions().fontScale >= STACK_FONT_SCALE;
}

/** Teto do ícone que acompanha texto: o mesmo do corpo (`maxFontSizeMultiplier` 2 em body/subheadline). */
export const ICON_FONT_SCALE_CAP = 2;

/**
 * Fator do ícone ao lado de texto: segue o tamanho de texto do sistema (como um SF Symbol inline), até 2×.
 * Sem ele, em AX5 o ícone de estado fica com 18 pt ao lado de um corpo de 34 pt.
 */
export function useIconScale(): number {
  return Math.min(useWindowDimensions().fontScale, ICON_FONT_SCALE_CAP);
}
