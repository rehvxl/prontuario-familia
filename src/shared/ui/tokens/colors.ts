/**
 * Cores do Prontuário da Família — Design System v4 ("Pasta com divisórias").
 *
 * A família é uma pasta: cada pessoa é uma divisória de cor plena (ultramar para a família; óxido, cromo,
 * grama, petróleo, violeta, siena e oliva para as pessoas) e o conteúdo é uma folha leitosa por cima.
 * A tinta é quase preta, azulada. O vermelhão fica só para erro e ação destrutiva. Estados clínicos usam
 * tinta neutra + ícone + texto, para nunca se confundir com a cor de uma pessoa.
 *
 * Os nomes da v2/v3 continuam (`primary`, `background`, `border`…). `primary*` é a tinta da divisória atual:
 * fora de uma divisória, a da família (ultramar); dentro de `HueProvider`/`DividerBoard`, a da pessoa.
 * Todos os pares de contraste estão em `tokens.test.ts` (WCAG AA) e na tabela do DESIGN_SYSTEM.md §2.
 */

export type ColorScheme = 'light' | 'dark';

export interface ColorTokens {
  /**
   * Fundo de tela sem divisória: branco leitoso frio. Sobre uma divisória, a folha usa `hue.leaf` (a `Leaf`
   * repassa esse tom como `background` aos filhos).
   */
  background: string;
  /** Campos, segmento escolhido e linhas que precisam destacar um pouco da folha. */
  surface: string;
  /** Superfície afundada: trilhos, skeleton, segmento não selecionado. */
  surfaceSunken: string;
  /** Sheets, menus e fallback do vidro. */
  surfaceRaised: string;
  /** @deprecated v3 — a v4 não destaca cartões por cor; use `surface`. */
  surfaceTinted: string;
  /** Véu atrás de sheets e diálogos. */
  scrim: string;

  /** Tinta. */
  textPrimary: string;
  textSecondary: string;
  /** Placeholder, metadados. Ainda ≥ 4,5:1 sobre a folha e o afundado. */
  textTertiary: string;
  textInverse: string;
  textDisabled: string;

  /** Fio fino entre linhas da folha (decorativo). */
  border: string;
  /** Contorno de campos e controles: ≥ 3:1 sobre surface (WCAG 1.4.11). */
  borderStrong: string;
  /** Anel de foco visível (tinta da divisória atual). */
  focusRing: string;

  /** Tinta da divisória atual: ação, link, linha do gráfico. Ultramar fora de uma divisória. */
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  primarySoft: string;
  onPrimarySoft: string;

  /** @deprecated v3 (sálvia) — decorativo neutro; não use em telas novas. */
  sage: string;
  /** Faixa do laudo na régua e no gráfico: o `soft` da divisória atual. Decorativa (< 3:1). */
  rangeBand: string;
  /** Trilho da régua e da barra de progresso. */
  rangeTrack: string;

  /**
   * Estados clínicos v4: tinta neutra (nunca a cor de uma pessoa, nunca vermelho). Quem informa é o ícone
   * + o texto ("dentro/acima/abaixo da faixa do laudo", "sem faixa no laudo"); acima/abaixo vão na tinta
   * forte, dentro na média, sem faixa na fraca.
   */
  clinicalIn: string;
  clinicalInSoft: string;
  onClinicalInSoft: string;
  clinicalHigh: string;
  clinicalHighSoft: string;
  onClinicalHighSoft: string;
  clinicalLow: string;
  clinicalLowSoft: string;
  onClinicalLowSoft: string;
  clinicalNone: string;
  clinicalNoneSoft: string;
  onClinicalNoneSoft: string;

  /** Sucesso, atenção e informação também são tinta neutra + ícone (cor é identidade de pessoa). */
  success: string;
  successSoft: string;
  onSuccessSoft: string;
  warning: string;
  warningSoft: string;
  onWarningSoft: string;
  /** Vermelhão: só erro e ação destrutiva. */
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
  background: '#F3F4F8',
  surface: '#FBFBFD',
  surfaceSunken: '#E6E8F0',
  surfaceRaised: '#FFFFFF',
  surfaceTinted: '#FBFBFD',
  scrim: 'rgba(10, 14, 40, 0.38)',

  textPrimary: '#141833',
  textSecondary: '#474C6B',
  textTertiary: '#575C7A',
  textInverse: '#FFFFFF',
  textDisabled: '#A3A7BC',

  border: '#D5D8E6',
  borderStrong: '#7A7F9E',
  focusRing: '#2B3FB8',

  primary: '#2B3FB8',
  primaryPressed: '#233497',
  onPrimary: '#FFFFFF',
  primarySoft: '#D3D7EE',
  onPrimarySoft: '#2B3FB8',

  sage: '#A3A7BC',
  rangeBand: '#D3D7EE',
  rangeTrack: '#E1E3EC',

  clinicalIn: '#3A3F5C',
  clinicalInSoft: '#E7E9F1',
  onClinicalInSoft: '#2E3350',
  clinicalHigh: '#141833',
  clinicalHighSoft: '#E1E3EC',
  onClinicalHighSoft: '#141833',
  clinicalLow: '#141833',
  clinicalLowSoft: '#E1E3EC',
  onClinicalLowSoft: '#141833',
  clinicalNone: '#575C7A',
  clinicalNoneSoft: '#ECEDF3',
  onClinicalNoneSoft: '#474C6B',

  success: '#3A3F5C',
  successSoft: '#E7E9F1',
  onSuccessSoft: '#2E3350',
  warning: '#141833',
  warningSoft: '#E1E3EC',
  onWarningSoft: '#141833',
  danger: '#BF1F2F',
  dangerPressed: '#9E1926',
  onDanger: '#FFFFFF',
  dangerSoft: '#F8E3E3',
  onDangerSoft: '#9A1824',
  info: '#3A3F5C',
  infoSoft: '#E7E9F1',
  onInfoSoft: '#2E3350',
};

export const darkColors: ColorTokens = {
  // Folha grafite leitosa sobre a divisória em matiz profundo.
  background: '#1E2029',
  surface: '#262833',
  surfaceSunken: '#2F3240',
  surfaceRaised: '#2A2C38',
  surfaceTinted: '#262833',
  scrim: 'rgba(0, 0, 0, 0.6)',

  textPrimary: '#ECEEF5',
  textSecondary: '#B9BDCF',
  textTertiary: '#A2A7BB',
  textInverse: '#12131A',
  textDisabled: '#5D6174',

  border: '#383B4A',
  borderStrong: '#7D8297',
  focusRing: '#9FAEFF',

  primary: '#9FAEFF',
  primaryPressed: '#B2BEFF',
  onPrimary: '#12131A',
  primarySoft: '#383C54',
  onPrimarySoft: '#9FAEFF',

  sage: '#5D6174',
  rangeBand: '#383C54',
  rangeTrack: '#33364A',

  clinicalIn: '#C9CCDA',
  clinicalInSoft: '#2C2F3C',
  onClinicalInSoft: '#D7DAE6',
  clinicalHigh: '#F2F3F8',
  clinicalHighSoft: '#343747',
  onClinicalHighSoft: '#F2F3F8',
  clinicalLow: '#F2F3F8',
  clinicalLowSoft: '#343747',
  onClinicalLowSoft: '#F2F3F8',
  clinicalNone: '#A2A7BB',
  clinicalNoneSoft: '#2A2C38',
  onClinicalNoneSoft: '#B9BDCF',

  success: '#C9CCDA',
  successSoft: '#2C2F3C',
  onSuccessSoft: '#D7DAE6',
  warning: '#F2F3F8',
  warningSoft: '#343747',
  onWarningSoft: '#F2F3F8',
  danger: '#FF8A80',
  dangerPressed: '#FFA59D',
  onDanger: '#12131A',
  dangerSoft: '#3D2224',
  onDangerSoft: '#FFC2BC',
  info: '#C9CCDA',
  infoSoft: '#2C2F3C',
  onInfoSoft: '#D7DAE6',
};

/**
 * Matiz de uma divisória (v4). Uma pessoa = um matiz, sempre o mesmo (`personBoard(categoricalIndexFor(id))`).
 * - `board`: cor plena da divisória (fundo da tela da pessoa). `onBoard`: texto/ícone sobre ela (≥ 4,5:1).
 * - `tab`/`onTab`: a aba na régua (no escuro, um tom acima do `board` para a aba se ver sobre outra divisória).
 * - `ink`: o matiz como texto/ícone/traço sobre a folha (≥ 4,5:1 sobre a folha, surface, afundado e soft).
 *   `inkPressed`/`onInk`: botão cheio na tinta da pessoa.
 * - `soft`: o matiz diluído na folha (faixa do laudo, seleção). Decorativo (< 3:1 sobre surface).
 */
export interface HueTokens {
  name: HueName;
  board: string;
  onBoard: string;
  tab: string;
  onTab: string;
  ink: string;
  inkPressed: string;
  onInk: string;
  soft: string;
  /**
   * A folha sobre esta divisória. Tom fixo em toda a pasta (92% de branco sobre o ultramar da família; no escuro,
   * o grafite leitoso de `background`): trocar de pessoa troca a divisória, nunca o papel, para a área grande
   * da tela não piscar.
   */
  leaf: string;
  /** Estilo da barra de status sobre a divisória ('light' = ícones claros). */
  statusBar: 'light' | 'dark';
}

/** Matiz da família e os 7 das pessoas, nessa ordem. */
export const HUE_NAMES = ['ultramar', 'oxido', 'cromo', 'grama', 'petroleo', 'violeta', 'siena', 'oliva'] as const;
export type HueName = (typeof HUE_NAMES)[number];
/** Nome legível do matiz (catálogo, documentação). */
export const HUE_LABELS: Readonly<Record<HueName, string>> = {
  ultramar: 'Ultramar',
  oxido: 'Óxido',
  cromo: 'Cromo',
  grama: 'Grama',
  petroleo: 'Petróleo',
  violeta: 'Violeta',
  siena: 'Siena',
  oliva: 'Oliva',
};

/** Mistura `a` → `b` na proporção `t` (0..1), em #RRGGBB. */
export function mixHex(a: string, b: string, t: number): string {
  const rgb = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i]! - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

type HueRow = Omit<HueTokens, 'statusBar' | 'leaf'>;
const withStatus = (rows: HueRow[], scheme: ColorScheme): HueTokens[] => {
  // A 1ª linha é o ultramar da família: o papel de toda a pasta.
  const leaf = scheme === 'light' ? mixHex('#FFFFFF', rows[0]!.board, 0.08) : darkColors.background;
  return rows.map((h) => ({ ...h, leaf, statusBar: h.onBoard === '#100E0C' ? 'dark' : 'light' }));
};

export const lightHues: readonly HueTokens[] = withStatus([
  { name: 'ultramar', board: '#2B3FB8', onBoard: '#FFFFFF', tab: '#2B3FB8', onTab: '#FFFFFF', ink: '#2B3FB8', inkPressed: '#233497', onInk: '#FFFFFF', soft: '#D3D7EE' },
  { name: 'oxido', board: '#D9541E', onBoard: '#100E0C', tab: '#D9541E', onTab: '#100E0C', ink: '#A83A0E', inkPressed: '#8A300B', onInk: '#FFFFFF', soft: '#EFDAD5' },
  { name: 'cromo', board: '#F2B90F', onBoard: '#100E0C', tab: '#F2B90F', onTab: '#100E0C', ink: '#7A5800', inkPressed: '#644800', onInk: '#FFFFFF', soft: '#F3EBD3' },
  { name: 'grama', board: '#3E8E3A', onBoard: '#100E0C', tab: '#3E8E3A', onTab: '#100E0C', ink: '#2D6B2A', inkPressed: '#255822', onInk: '#FFFFFF', soft: '#D6E4DA' },
  { name: 'petroleo', board: '#127A80', onBoard: '#FFFFFF', tab: '#127A80', onTab: '#FFFFFF', ink: '#0E6469', inkPressed: '#0B5256', onInk: '#FFFFFF', soft: '#CFE0E5' },
  { name: 'violeta', board: '#6B3FA0', onBoard: '#FFFFFF', tab: '#6B3FA0', onTab: '#FFFFFF', ink: '#6B3FA0', inkPressed: '#583483', onInk: '#FFFFFF', soft: '#DDD7EA' },
  { name: 'siena', board: '#8A4B2A', onBoard: '#FFFFFF', tab: '#8A4B2A', onTab: '#FFFFFF', ink: '#8A4B2A', inkPressed: '#713E22', onInk: '#FFFFFF', soft: '#E2D9D7' },
  { name: 'oliva', board: '#7A8418', onBoard: '#100E0C', tab: '#7A8418', onTab: '#100E0C', ink: '#5A6110', inkPressed: '#4A500D', onInk: '#FFFFFF', soft: '#E0E2D4' },
], 'light');

export const darkHues: readonly HueTokens[] = withStatus([
  { name: 'ultramar', board: '#1B2672', onBoard: '#F5F6FA', tab: '#223190', onTab: '#F5F6FA', ink: '#9FAEFF', inkPressed: '#B2BEFF', onInk: '#12131A', soft: '#383C54' },
  { name: 'oxido', board: '#7A2A0A', onBoard: '#F5F6FA', tab: '#A94217', onTab: '#F5F6FA', ink: '#FF9C70', inkPressed: '#FFB08D', onInk: '#12131A', soft: '#4B3937' },
  { name: 'cromo', board: '#6B5000', onBoard: '#F5F6FA', tab: '#BD900C', onTab: '#100E0C', ink: '#F2C440', inkPressed: '#F5D066', onInk: '#12131A', soft: '#48412E' },
  { name: 'grama', board: '#1F4F1D', onBoard: '#F5F6FA', tab: '#306F2D', onTab: '#F5F6FA', ink: '#86CF80', inkPressed: '#9ED999', onInk: '#12131A', soft: '#33433A' },
  { name: 'petroleo', board: '#0A4246', onBoard: '#F5F6FA', tab: '#0E5F64', onTab: '#F5F6FA', ink: '#6CCCD2', inkPressed: '#89D6DB', onInk: '#12131A', soft: '#2E424B' },
  { name: 'violeta', board: '#3A2160', onBoard: '#F5F6FA', tab: '#53317D', onTab: '#F5F6FA', ink: '#C6A5F0', inkPressed: '#D1B7F3', onInk: '#12131A', soft: '#403B51' },
  { name: 'siena', board: '#4E2814', onBoard: '#F5F6FA', tab: '#6C3B21', onTab: '#F5F6FA', ink: '#E2A57F', inkPressed: '#E8B799', onInk: '#12131A', soft: '#453B3A' },
  { name: 'oliva', board: '#3E4410', onBoard: '#F5F6FA', tab: '#5F6713', onTab: '#F5F6FA', ink: '#C3CC5C', inkPressed: '#CFD67D', onInk: '#12131A', soft: '#3F4233' },
], 'dark');

/**
 * Paleta categórica (v4): os 7 matizes das pessoas (índices 0..6, de `categoricalIndexFor`) e, no índice 7,
 * a tinta neutra para o que não é pessoa (tipos de registro). Cor é identidade de pessoa; tipo de documento
 * se distingue por ícone + rótulo (`NEUTRAL_CATEGORICAL`).
 * `main` = `ink` do matiz (≥ 4,5:1 sobre surface, background e `soft`); `onMain` = texto sobre `main`.
 */
export interface CategoricalColor {
  name: CategoricalName;
  main: string;
  soft: string;
  onMain: string;
}

export const CATEGORICAL_NAMES = ['oxido', 'cromo', 'grama', 'petroleo', 'violeta', 'siena', 'oliva', 'tinta'] as const;
export type CategoricalName = (typeof CATEGORICAL_NAMES)[number];
/** Índice na paleta categórica: 0..6 pessoas, 7 neutro. */
export type CategoricalIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
/** Índice de pessoa (0..6), o que `categoricalIndexFor` devolve. */
export type PersonHueIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
/** Quantos matizes de pessoa existem (o módulo do hash estável). */
export const PERSON_HUE_COUNT = 7;
/** @deprecated v3 — use `PERSON_HUE_COUNT`. */
export const CATEGORICAL_COUNT = PERSON_HUE_COUNT;
/** Entrada neutra da paleta categórica (tipos de registro e o que não é de uma pessoa). */
export const NEUTRAL_CATEGORICAL = 7 as const;

function categoricalFrom(hues: readonly HueTokens[], colors: ColorTokens): readonly CategoricalColor[] {
  const people = hues.slice(1).map((h) => ({ name: h.name as CategoricalName, main: h.ink, soft: h.soft, onMain: h.onInk }));
  return [...people, { name: 'tinta', main: colors.textSecondary, soft: colors.surfaceSunken, onMain: colors.textInverse }];
}

export const lightCategorical = categoricalFrom(lightHues, lightColors);
export const darkCategorical = categoricalFrom(darkHues, darkColors);

export const palettes = {
  light: { colors: lightColors, categorical: lightCategorical, hues: lightHues },
  dark: { colors: darkColors, categorical: darkCategorical, hues: darkHues },
} as const;
