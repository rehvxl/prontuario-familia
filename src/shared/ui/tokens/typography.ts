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
  | 'display'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'bodyStrong'
  | 'callout'
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

export const typography: Record<TypographyVariant, TypographyToken> = {
  display: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: -0.6, maxFontSizeMultiplier: 1.4, isHeading: true },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.5, maxFontSizeMultiplier: 1.5, isHeading: true },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3, maxFontSizeMultiplier: 1.6, isHeading: true },
  title3: { fontSize: 20, lineHeight: 26, fontWeight: '600', letterSpacing: -0.2, maxFontSizeMultiplier: 1.7, isHeading: true },
  headline: { fontSize: 17, lineHeight: 23, fontWeight: '600', letterSpacing: -0.2, maxFontSizeMultiplier: 2, isHeading: false },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400', letterSpacing: -0.2, maxFontSizeMultiplier: 2, isHeading: false },
  bodyStrong: { fontSize: 17, lineHeight: 24, fontWeight: '600', letterSpacing: -0.2, maxFontSizeMultiplier: 2, isHeading: false },
  callout: { fontSize: 16, lineHeight: 22, fontWeight: '400', letterSpacing: -0.1, maxFontSizeMultiplier: 2, isHeading: false },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.1, maxFontSizeMultiplier: 2, isHeading: false },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: 0, maxFontSizeMultiplier: 2, isHeading: false },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500', letterSpacing: 0.1, maxFontSizeMultiplier: 2, isHeading: false },
  label: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2, maxFontSizeMultiplier: 1.8, isHeading: false },
};
