/**
 * Cores do Prontuário da Família.
 *
 * Direção "Pasta da família": papel claro levemente quente, tinta azul-caneta como única cor de ação
 * e divisórias coloridas (paleta categórica) para separar tipos de documento.
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
  background: '#F5F5F1',
  surface: '#FFFFFF',
  surfaceSunken: '#ECECE6',
  surfaceRaised: '#FFFFFF',
  scrim: 'rgba(17, 19, 24, 0.45)',

  textPrimary: '#1B1F2A',
  textSecondary: '#4A5060',
  textTertiary: '#626878',
  textInverse: '#FFFFFF',
  textDisabled: '#8D919C',

  border: '#E1E1DA',
  borderStrong: '#848A98',
  focusRing: '#2D45B5',

  primary: '#2D45B5',
  primaryPressed: '#22378F',
  onPrimary: '#FFFFFF',
  primarySoft: '#E6EAFA',
  onPrimarySoft: '#1E2F80',

  success: '#1E7A4C',
  successSoft: '#E3F3EA',
  onSuccessSoft: '#1A6A42',
  warning: '#8A5300',
  warningSoft: '#FCF0D9',
  onWarningSoft: '#7A4A00',
  danger: '#B3261E',
  dangerPressed: '#8F1E18',
  onDanger: '#FFFFFF',
  dangerSoft: '#FBE7E5',
  onDangerSoft: '#9A1F18',
  info: '#1D6584',
  infoSoft: '#E2F0F6',
  onInfoSoft: '#185874',
};

export const darkColors: ColorTokens = {
  background: '#111318',
  surface: '#1A1D24',
  surfaceSunken: '#0C0E12',
  surfaceRaised: '#232731',
  scrim: 'rgba(0, 0, 0, 0.6)',

  textPrimary: '#ECEDF0',
  textSecondary: '#B6BAC5',
  textTertiary: '#9095A3',
  textInverse: '#111318',
  textDisabled: '#5F6472',

  border: '#2A2E38',
  borderStrong: '#6E7484',
  focusRing: '#9FB1FF',

  primary: '#9FB1FF',
  primaryPressed: '#BCC8FF',
  onPrimary: '#10183F',
  primarySoft: '#263063',
  onPrimarySoft: '#D6DDFF',

  success: '#7FD3A4',
  successSoft: '#1D3A2B',
  onSuccessSoft: '#A9E5C3',
  warning: '#F2BE62',
  warningSoft: '#3D3020',
  onWarningSoft: '#F7D597',
  danger: '#FF9A8F',
  dangerPressed: '#FFB8B0',
  onDanger: '#3D0905',
  dangerSoft: '#46211F',
  onDangerSoft: '#FFC4BD',
  info: '#7CC8E8',
  infoSoft: '#1B3542',
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
  { name: 'blue', main: '#2F5FD0', soft: '#ECF1FB', onMain: '#FFFFFF' },
  { name: 'teal', main: '#0E7672', soft: '#E9F3F2', onMain: '#FFFFFF' },
  { name: 'green', main: '#3A7522', soft: '#EDF3EB', onMain: '#FFFFFF' },
  { name: 'amber', main: '#A65800', soft: '#F7F0E8', onMain: '#FFFFFF' },
  { name: 'rose', main: '#C0335A', soft: '#F9EDF0', onMain: '#FFFFFF' },
  { name: 'violet', main: '#7449BF', soft: '#F2EFF9', onMain: '#FFFFFF' },
  { name: 'slate', main: '#56607A', soft: '#F0F1F3', onMain: '#FFFFFF' },
];

export const darkCategorical: readonly CategoricalColor[] = [
  { name: 'blue', main: '#82A4FF', soft: '#2F3850', onMain: '#111318' },
  { name: 'teal', main: '#4FC6C0', soft: '#253F43', onMain: '#111318' },
  { name: 'green', main: '#8FCB6E', soft: '#314033', onMain: '#111318' },
  { name: 'amber', main: '#F0A24D', soft: '#45382C', onMain: '#111318' },
  { name: 'rose', main: '#F4859F', soft: '#46323D', onMain: '#111318' },
  { name: 'violet', main: '#B99EFF', soft: '#3A3750', onMain: '#111318' },
  { name: 'slate', main: '#A6AFC2', soft: '#363A44', onMain: '#111318' },
];

export const palettes = {
  light: { colors: lightColors, categorical: lightCategorical },
  dark: { colors: darkColors, categorical: darkCategorical },
} as const;
