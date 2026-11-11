/**
 * Cores do Prontuário da Família — Design System v2 ("nativo").
 *
 * Os valores espelham as cores semânticas do sistema (iOS grouped / Material 3 neutro) para que as
 * telas em RN combinem com os controles nativos do @expo/ui. Uma única cor de ação (azul da família)
 * e uma paleta categórica de 7 cores para tipos de documento e pessoas.
 * Para cabeçalhos e fundos que devem acompanhar o sistema, use `theme.native` (PlatformColor).
 * Todos os pares texto/fundo são verificados por `tokens.test.ts` (WCAG AA).
 */

export type ColorScheme = 'light' | 'dark';

export interface ColorTokens {
  /** Fundo da tela (o "papel"). */
  background: string;
  /** Superfície de cartões, campos e listas. */
  surface: string;
  /** Superfície afundada: trilhos, skeleton, segmento não selecionado. */
  surfaceSunken: string;
  /** Superfície elevada sobre surface (folha/sheet, menus). */
  surfaceRaised: string;
  /** Véu atrás de sheets e diálogos. */
  scrim: string;

  textPrimary: string;
  textSecondary: string;
  /** Placeholder, metadados. Ainda ≥ 4.5:1 sobre background e surface. */
  textTertiary: string;
  textInverse: string;
  textDisabled: string;

  /** Separadores decorativos (não carregam significado). */
  border: string;
  /** Contorno de campos e controles: ≥ 3:1 sobre surface (WCAG 1.4.11). */
  borderStrong: string;
  /** Anel de foco visível. */
  focusRing: string;

  /** Azul-caneta: a única cor de ação. */
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  primarySoft: string;
  onPrimarySoft: string;

  success: string;
  successSoft: string;
  onSuccessSoft: string;
  warning: string;
  warningSoft: string;
  onWarningSoft: string;
  danger: string;
  dangerPressed: string;
  onDanger: string;
  dangerSoft: string;
  onDangerSoft: string;
  info: string;
  infoSoft: string;
  onInfoSoft: string;
}

export const lightColors: ColorTokens = {
  // Paleta "agrupada" do iOS (systemGroupedBackground / secondarySystemGroupedBackground),
  // com os rótulos secundários escurecidos para passar AA — o iOS usa 60% de opacidade, que não passa.
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceSunken: '#E9E9EF',
  surfaceRaised: '#FFFFFF',
  scrim: 'rgba(0, 0, 0, 0.35)',

  textPrimary: '#111114',
  textSecondary: '#55555C',
  textTertiary: '#6B6B72',
  textInverse: '#FFFFFF',
  textDisabled: '#A1A1A8',

  border: '#DCDCE1',
  borderStrong: '#8A8A91',
  focusRing: '#1D5BD6',

  // Azul da família: menos "caneta", mais próximo do azul do sistema, mas com 5,9:1 sobre branco.
  primary: '#1D5BD6',
  primaryPressed: '#1649AE',
  onPrimary: '#FFFFFF',
  primarySoft: '#E5EDFC',
  onPrimarySoft: '#123F99',

  success: '#1C7A45',
  successSoft: '#E2F4E8',
  onSuccessSoft: '#17683B',
  warning: '#8A5300',
  warningSoft: '#FCF0D9',
  onWarningSoft: '#7A4A00',
  danger: '#C4261D',
  dangerPressed: '#A11E17',
  onDanger: '#FFFFFF',
  dangerSoft: '#FDE8E6',
  onDangerSoft: '#A11E17',
  info: '#1D6584',
  infoSoft: '#E2F0F6',
  onInfoSoft: '#185874',
};

export const darkColors: ColorTokens = {
  // Preto verdadeiro (OLED) com superfícies agrupadas elevadas do iOS escuro.
  background: '#000000',
  surface: '#1C1C1E',
  surfaceSunken: '#2C2C2E',
  surfaceRaised: '#2C2C2E',
  scrim: 'rgba(0, 0, 0, 0.55)',

  textPrimary: '#FFFFFF',
  textSecondary: '#AEAEB2',
  textTertiary: '#98989F',
  textInverse: '#000000',
  textDisabled: '#5A5A60',

  border: '#38383A',
  borderStrong: '#7C7C82',
  focusRing: '#6E9EFF',

  primary: '#6E9EFF',
  primaryPressed: '#94B7FF',
  onPrimary: '#000000',
  primarySoft: '#1A2C52',
  onPrimarySoft: '#C9DAFF',

  success: '#6FD49A',
  successSoft: '#163323',
  onSuccessSoft: '#A6E8C1',
  warning: '#F2BE62',
  warningSoft: '#3A2D17',
  onWarningSoft: '#F7D597',
  danger: '#FF8A80',
  dangerPressed: '#FFADA6',
  onDanger: '#330704',
  dangerSoft: '#3F1A18',
  onDangerSoft: '#FFC4BD',
  info: '#74C4E8',
  infoSoft: '#15303D',
  onInfoSoft: '#B2DFF2',
};

/**
 * Paleta categórica de 7 cores ("divisórias da pasta"). Genérica: shared/ui não sabe o que cada cor
 * significa. `main` tem ≥ 4.5:1 sobre surface e sobre `soft`; serve como texto, ícone ou marcador.
 */
export interface CategoricalColor {
  /** Nome neutro da cor, útil em documentação e testes. */
  name: CategoricalName;
  main: string;
  soft: string;
  /** Texto/ícone sobre `main` (ex.: iniciais do Avatar). */
  onMain: string;
}

export const CATEGORICAL_NAMES = ['blue', 'teal', 'green', 'amber', 'rose', 'violet', 'slate'] as const;
export type CategoricalName = (typeof CATEGORICAL_NAMES)[number];
/** Índice 0..6 na paleta categórica. */
export type CategoricalIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const CATEGORICAL_COUNT = CATEGORICAL_NAMES.length;

export const lightCategorical: readonly CategoricalColor[] = [
  { name: 'blue', main: '#2862D9', soft: '#EAF0FC', onMain: '#FFFFFF' },
  { name: 'teal', main: '#0B7A75', soft: '#E4F4F2', onMain: '#FFFFFF' },
  { name: 'green', main: '#367A1F', soft: '#EAF4E5', onMain: '#FFFFFF' },
  { name: 'amber', main: '#A35A00', soft: '#FBF0E2', onMain: '#FFFFFF' },
  { name: 'rose', main: '#C62E5A', soft: '#FCEBF0', onMain: '#FFFFFF' },
  { name: 'violet', main: '#7447C9', soft: '#F1ECFB', onMain: '#FFFFFF' },
  { name: 'slate', main: '#5A6278', soft: '#EEF0F4', onMain: '#FFFFFF' },
];

export const darkCategorical: readonly CategoricalColor[] = [
  { name: 'blue', main: '#7EA6FF', soft: '#1B2A4A', onMain: '#000000' },
  { name: 'teal', main: '#4CCDC5', soft: '#123634', onMain: '#000000' },
  { name: 'green', main: '#8BD36A', soft: '#1D3416', onMain: '#000000' },
  { name: 'amber', main: '#F5A54A', soft: '#3A2812', onMain: '#000000' },
  { name: 'rose', main: '#FF86A6', soft: '#401C28', onMain: '#000000' },
  { name: 'violet', main: '#BA9CFF', soft: '#2C2148', onMain: '#000000' },
  { name: 'slate', main: '#A9B1C4', soft: '#2A2D35', onMain: '#000000' },
];

export const palettes = {
  light: { colors: lightColors, categorical: lightCategorical },
  dark: { colors: darkColors, categorical: darkCategorical },
} as const;
