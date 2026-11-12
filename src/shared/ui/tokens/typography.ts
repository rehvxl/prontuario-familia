import { Platform, type TextStyle } from 'react-native';

/**
 * Tipografia v4 ("Pasta com divisórias"): uma grotesca de manual, Archivo SemiCondensed (OFL,
 * assets/fonts), em poucos tamanhos. Corpo de 17 pt faz quase tudo; a hierarquia vem do peso e da cor da
 * divisória. Título de tela 34/30, seção 20, corpo 17, apoio 15, legenda 13. Sem serifa em lugar nenhum.
 * Números comparáveis em `tabular-nums` (métricas já ligam).
 *
 * Cada peso é um arquivo estático: o `fontFamily` muda com o peso (`fontFamilyFor`). iOS usa o nome
 * PostScript, Android o nome do arquivo; aqui os dois são iguais (ArchivoSC-Regular…Bold). Sem a fonte
 * carregada, `theme.font()` cai para a fonte do sistema.
 * `maxFontSizeMultiplier` limita só o exagero que quebra layout.
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
  | 'label'
  | 'metricHero'
  | 'metric'
  | 'metricUnit';

export type FontWeight = '400' | '500' | '600' | '700';

export interface TypographyToken {
  fontSize: number;
  lineHeight: number;
  fontWeight: FontWeight;
  letterSpacing: number;
  /** Teto do multiplicador de fonte do sistema para esta variante. */
  maxFontSizeMultiplier: number;
  /** Variantes de título são anunciadas como cabeçalho pelo leitor de tela. */
  isHeading: boolean;
  /** Números de largura fixa por padrão (valores clínicos). */
  tabular?: boolean;
}

/** Nome da família por peso (PostScript no iOS = nome do arquivo no Android). */
export const ARCHIVO = {
  '400': 'ArchivoSC-Regular',
  '500': 'ArchivoSC-Medium',
  '600': 'ArchivoSC-SemiBold',
  '700': 'ArchivoSC-Bold',
} as const satisfies Record<FontWeight, string>;

/** Fonte do sistema, quando a Archivo não carregou. */
export const fontFamily = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });
export const fontFamilyMedium = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' });

/** Normaliza qualquer `fontWeight` do RN para um dos 4 cortes da Archivo (bold/800/900 → 700, 300 → 400). */
export function normalizeWeight(weight: TextStyle['fontWeight'] | undefined): FontWeight {
  if (weight === 'bold') return '700';
  const n = typeof weight === 'number' ? weight : Number.parseInt(String(weight ?? '400'), 10);
  if (!Number.isFinite(n) || n < 450) return '400';
  if (n < 550) return '500';
  if (n < 650) return '600';
  return '700';
}

/** Família Archivo do peso pedido. */
export const fontFamilyFor = (weight: TextStyle['fontWeight'] | undefined) => ARCHIVO[normalizeWeight(weight)];

const largeTitle: TypographyToken = { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.6, maxFontSizeMultiplier: 1.4, isHeading: true };
const subheadline: TypographyToken = { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: 0, maxFontSizeMultiplier: 2, isHeading: false };
const section: TypographyToken = { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2, maxFontSizeMultiplier: 1.7, isHeading: true };

/**
 * Nomes seguem os estilos de texto do iOS. `display` e `subhead` são aliases v1. `title2` e `title3` são o
 * mesmo título de seção (20 pt): menos tamanhos, mais peso. Legenda fica em 13 pt (público 60+).
 */
export const typography: Record<TypographyVariant, TypographyToken> = {
  largeTitle,
  /** @deprecated v1 — use `largeTitle`. */
  display: largeTitle,
  subheadline,
  /** @deprecated v1 — use `subheadline`. */
  subhead: subheadline,
  /** Título de tela de pessoa/detalhe. */
  title1: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.5, maxFontSizeMultiplier: 1.5, isHeading: true },
  title2: section,
  title3: section,
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: 0, maxFontSizeMultiplier: 2, isHeading: false },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400', letterSpacing: 0, maxFontSizeMultiplier: 2, isHeading: false },
  bodyStrong: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: 0, maxFontSizeMultiplier: 2, isHeading: false },
  /** v4: um corpo só; `callout` é o corpo de 17. */
  callout: { fontSize: 17, lineHeight: 22, fontWeight: '400', letterSpacing: 0, maxFontSizeMultiplier: 2, isHeading: false },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: 0.1, maxFontSizeMultiplier: 2, isHeading: false },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500', letterSpacing: 0.1, maxFontSizeMultiplier: 2, isHeading: false },
  label: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: 0, maxFontSizeMultiplier: 1.8, isHeading: false },
  /** Valor atual na tela de tendência: o tamanho do título de tela, em numerais tabulares. */
  metricHero: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.4, maxFontSizeMultiplier: 1.6, isHeading: false, tabular: true },
  /** Valor numa linha de exame. */
  metric: { fontSize: 20, lineHeight: 26, fontWeight: '600', letterSpacing: 0, maxFontSizeMultiplier: 2, isHeading: false, tabular: true },
  /** Unidade ao lado do valor (4 pt de distância, nunca colada). */
  metricUnit: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: 0, maxFontSizeMultiplier: 2, isHeading: false },
};
