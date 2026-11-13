import { useWindowDimensions } from 'react-native';

/**
 * Multiplicador de fonte a partir do qual o que fica lado a lado empilha. O texto do app para em 2× (`maxFontSizeMultiplier`)
 * e o Android não passa de 2,0×: com o limite no iOS AX3 (≈ 2,35×) a pilha nunca ligava no Android e rótulos quebravam no
 * meio da palavra. 1,75× liga no Android grande e no iOS AX2 em diante.
 */
export const STACK_FONT_SCALE = 1.75;

/** true a partir de `STACK_FONT_SCALE` (DESIGN.md › Typography): linhas de métrica, tiles e ações empilham. */
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
