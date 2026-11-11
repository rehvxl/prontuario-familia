import { Platform, type TextStyle } from 'react-native';

/**
 * Escala tipográfica. Fonte do sistema (SF Pro no iOS, Roboto no Android): é a mais legível
 * em tamanhos grandes e já segue Dynamic Type / escala de fonte do Android.
 *
 * Corpo em 17 pt (iOS Body). Nada abaixo de 13 pt para texto que precisa ser lido.
 * `maxFontSizeMultiplier` limita apenas o exagero que quebra layout: corpo pode dobrar,
 * títulos grandes crescem até 1,6× (já começam grandes).
 */
export type TypographyVariant =
  | 'largeTitle'
  | 'display'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'bodyStrong'
  | 'callout'
  | 'subheadline'
  | 'subhead'
  | 'footnote'
  | 'caption'
  | 'label';

export interface TypographyToken {
  fontSize: number;
  lineHeight: number;
  fontWeight: NonNullable<TextStyle['fontWeight']>;
  letterSpacing: number;
  /** Teto do multiplicador de fonte do sistema para esta variante. */
  maxFontSizeMultiplier: number;
  /** Variantes de título são anunciadas como cabeçalho pelo leitor de tela. */
  isHeading: boolean;
}

export const fontFamily = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });
export const fontFamilyMedium = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' });

const largeTitle: TypographyToken = { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.4, maxFontSizeMultiplier: 1.4, isHeading: true };
const subheadline: TypographyToken = { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.2, maxFontSizeMultiplier: 2, isHeading: false };

/**
 * Nomes seguem os estilos de texto do iOS (largeTitle…caption). `display` e `subhead` são aliases v1
 * de `largeTitle` e `subheadline`. Desvio documentado: caption fica em 13 pt (o iOS usa 12) porque o
 * público inclui pessoas mais velhas.
 */
export const typography: Record<TypographyVariant, TypographyToken> = {
  largeTitle,
  /** @deprecated v1 — use `largeTitle`. */
  display: largeTitle,
  subheadline,
  /** @deprecated v1 — use `subheadline`. */
  subhead: subheadline,
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.36, maxFontSizeMultiplier: 1.5, isHeading: true },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.26, maxFontSizeMultiplier: 1.6, isHeading: true },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: -0.45, maxFontSizeMultiplier: 1.7, isHeading: true },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.43, maxFontSizeMultiplier: 2, isHeading: false },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400', letterSpacing: -0.43, maxFontSizeMultiplier: 2, isHeading: false },
  bodyStrong: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.43, maxFontSizeMultiplier: 2, isHeading: false },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400', letterSpacing: -0.31, maxFontSizeMultiplier: 2, isHeading: false },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: -0.08, maxFontSizeMultiplier: 2, isHeading: false },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500', letterSpacing: 0.1, maxFontSizeMultiplier: 2, isHeading: false },
  label: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2, maxFontSizeMultiplier: 1.8, isHeading: false },
};
