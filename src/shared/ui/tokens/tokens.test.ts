import { contrastRatio } from './contrast';
import {
  CATEGORICAL_NAMES,
  HUE_NAMES,
  NEUTRAL_CATEGORICAL,
  darkCategorical,
  darkColors,
  darkHues,
  lightCategorical,
  lightColors,
  lightHues,
  type ColorTokens,
  type HueTokens,
} from './colors';
import { elevationStyle } from './elevation';
import { boardSwap } from './motion';
import { radii } from './radii';
import { layout, space } from './spacing';
import { ARCHIVO, fontFamilyFor, normalizeWeight, typography } from './typography';

const AA_TEXT = 4.5;
const AA_UI = 3;

type Pair = [fg: keyof ColorTokens, bg: keyof ColorTokens];
const LEAVES = ['background', 'surface', 'surfaceSunken', 'surfaceRaised'] as const;

/** Texto (≥ 4,5:1): tinta sobre a folha e as superfícies, tinta da divisória, estados e pares "on". */
const TEXT_PAIRS: Pair[] = [
  ...LEAVES.flatMap((bg) => (['textPrimary', 'textSecondary', 'textTertiary', 'primary', 'danger'] as const).map((fg) => [fg, bg] as Pair)),
  ...LEAVES.flatMap((bg) => (['clinicalIn', 'clinicalHigh', 'clinicalLow', 'clinicalNone', 'success', 'warning', 'info'] as const).map((fg) => [fg, bg] as Pair)),
  ['onPrimary', 'primary'],
  ['onPrimary', 'primaryPressed'],
  ['primary', 'primarySoft'],
  ['onPrimarySoft', 'primarySoft'],
  ['textPrimary', 'primarySoft'],
  ['onDanger', 'danger'],
  ['onDanger', 'dangerPressed'],
  ['onDangerSoft', 'dangerSoft'],
  ['onSuccessSoft', 'successSoft'],
  ['onWarningSoft', 'warningSoft'],
  ['onInfoSoft', 'infoSoft'],
  ['clinicalIn', 'clinicalInSoft'],
  ['clinicalHigh', 'clinicalHighSoft'],
  ['clinicalLow', 'clinicalLowSoft'],
  ['clinicalNone', 'clinicalNoneSoft'],
  ['onClinicalInSoft', 'clinicalInSoft'],
  ['onClinicalHighSoft', 'clinicalHighSoft'],
  ['onClinicalLowSoft', 'clinicalLowSoft'],
  ['onClinicalNoneSoft', 'clinicalNoneSoft'],
  ['textPrimary', 'rangeBand'],
  ['textSecondary', 'rangeTrack'],
  ['textInverse', 'textPrimary'],
];

/** UI e gráfico (≥ 3:1, WCAG 1.4.11). */
const UI_PAIRS: Pair[] = [
  ['borderStrong', 'surface'],
  ['borderStrong', 'background'],
  ['focusRing', 'surface'],
  ['focusRing', 'background'],
  ['primary', 'surfaceSunken'],
  ['primary', 'rangeTrack'],
  ['primary', 'rangeBand'],
];

const ratio = (a: string, b: string) => contrastRatio(a, b);

describe.each([
  ['claro', lightColors, lightHues, lightCategorical] as const,
  ['escuro', darkColors, darkHues, darkCategorical] as const,
])('tokens de cor v4 — tema %s', (_name, colors, hues, categorical) => {
  it.each(TEXT_PAIRS)('%s sobre %s: texto ≥ 4,5:1', (fg, bg) => {
    expect(ratio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(UI_PAIRS)('%s sobre %s: UI ≥ 3:1', (fg, bg) => {
    expect(ratio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(AA_UI);
  });

  it('a faixa do laudo e o soft são decorativos (< 3:1 sobre surface): nunca informam sozinhos', () => {
    expect(ratio(colors.rangeBand, colors.surface)).toBeLessThan(AA_UI);
  });

  it('a família é ultramar e `primary*` padrão é a tinta dela', () => {
    const family = hues[0]!;
    expect(family.name).toBe('ultramar');
    expect(colors.primary).toBe(family.ink);
    expect(colors.primaryPressed).toBe(family.inkPressed);
    expect(colors.onPrimary).toBe(family.onInk);
    expect(colors.primarySoft).toBe(family.soft);
    expect(colors.rangeBand).toBe(family.soft);
  });

  it('8 matizes na ordem: família + 7 pessoas', () => {
    expect(hues.map((h) => h.name)).toEqual([...HUE_NAMES]);
  });

  describe.each(hues.map((h) => [h.name, h] as [string, HueTokens]))('divisória %s', (_n, h) => {
    it('onBoard sobre board e onTab sobre tab ≥ 4,5:1', () => {
      expect(ratio(h.onBoard, h.board)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(ratio(h.onTab, h.tab)).toBeGreaterThanOrEqual(AA_TEXT);
    });
    it.each(LEAVES)('ink sobre %s ≥ 4,5:1', (bg) => {
      expect(ratio(h.ink, colors[bg])).toBeGreaterThanOrEqual(AA_TEXT);
    });
    it('ink sobre soft, onInk sobre ink e inkPressed ≥ 4,5:1; soft decorativo', () => {
      expect(ratio(h.ink, h.soft)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(ratio(colors.textPrimary, h.soft)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(ratio(h.onInk, h.ink)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(ratio(h.onInk, h.inkPressed)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(ratio(h.soft, colors.surface)).toBeLessThan(AA_UI);
      expect(ratio(h.ink, colors.surfaceSunken)).toBeGreaterThanOrEqual(AA_UI);
    });
    it('folha sobre a divisória: todo texto ≥ 4,5:1 (tinta, estados, vermelhão e a tinta de qualquer pessoa)', () => {
      const inks = [
        ...(['textPrimary', 'textSecondary', 'textTertiary', 'danger', 'clinicalIn', 'clinicalHigh', 'clinicalLow', 'clinicalNone', 'success', 'warning', 'info'] as const).map((k) => colors[k]),
        ...hues.map((x) => x.ink),
      ];
      for (const fg of inks) expect(ratio(fg, h.leaf)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(ratio(colors.borderStrong, h.leaf)).toBeGreaterThanOrEqual(AA_UI);
    });
    it('papel de tom fixo: a folha é a mesma em todas as divisórias (trocar de pessoa não pisca a folha)', () => {
      expect(new Set(hues.map((x) => x.leaf)).size).toBe(1);
    });
    it('barra de status segue o onBoard', () => {
      expect(h.statusBar).toBe(h.onBoard === '#100E0C' ? 'dark' : 'light');
    });
  });

  it.each(CATEGORICAL_NAMES.map((n, i) => [n, i] as const))('categórica %s: main ≥ 4,5:1 sobre surface, background, soft; onMain sobre main', (name, i) => {
    const c = categorical[i]!;
    expect(c.name).toBe(name);
    for (const bg of [colors.surface, colors.background, c.soft]) expect(ratio(c.main, bg)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(ratio(c.onMain, c.main)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('categórica 0..6 é a tinta das pessoas; 7 é neutra', () => {
    hues.slice(1).forEach((h, i) => expect(categorical[i]!.main).toBe(h.ink));
    expect(categorical[NEUTRAL_CATEGORICAL]!.name).toBe('tinta');
    expect(hues.map((h) => h.ink)).not.toContain(categorical[NEUTRAL_CATEGORICAL]!.main);
  });

  it('estados clínicos e de aviso nunca usam a cor de uma pessoa nem o vermelhão', () => {
    const hueColors = new Set(hues.flatMap((h) => [h.board, h.tab, h.ink, h.soft]));
    const states = [
      colors.clinicalIn,
      colors.clinicalHigh,
      colors.clinicalLow,
      colors.clinicalNone,
      colors.clinicalInSoft,
      colors.clinicalHighSoft,
      colors.clinicalLowSoft,
      colors.clinicalNoneSoft,
      colors.success,
      colors.warning,
      colors.info,
    ];
    for (const c of states) {
      expect(hueColors.has(c)).toBe(false);
      expect(c).not.toBe(colors.danger);
    }
  });

  it('o vermelhão não é a cor de nenhuma pessoa', () => {
    expect(hues.flatMap((h) => [h.board, h.tab, h.ink])).not.toContain(colors.danger);
  });
});

describe('folha v4: 92% de branco sobre a divisória', () => {
  it('no claro, o papel é um só: 8% do ultramar da família (#EEF0F9) em todas as divisórias', () => {
    expect(new Set(lightHues.map((h) => h.leaf))).toEqual(new Set(['#EEF0F9']));
  });

  it('no escuro, a folha é o grafite leitoso em toda divisória', () => {
    for (const h of darkHues) expect(h.leaf).toBe(darkColors.background);
  });
});

describe('sem creme, sem sálvia', () => {
  it.each([
    ['claro', lightColors],
    ['escuro', darkColors],
  ] as const)('a folha é fria e neutra (%s): azul ≥ vermelho', (_n, colors) => {
    const rgb = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
    for (const key of ['background', 'surface', 'surfaceSunken'] as const) {
      const [r, , b] = rgb(colors[key]);
      expect(b!).toBeGreaterThanOrEqual(r!);
    }
  });
});

describe('tipografia, raios, espaçamento, movimento e elevação v4', () => {
  it('poucos tamanhos: título 34/30, seção 20, corpo 17, apoio 15, legenda 13', () => {
    expect(typography.largeTitle).toMatchObject({ fontSize: 34, lineHeight: 40, fontWeight: '700', isHeading: true, maxFontSizeMultiplier: 1.4 });
    expect(typography.title1).toMatchObject({ fontSize: 30, fontWeight: '700', isHeading: true });
    expect(typography.title2).toMatchObject({ fontSize: 20, fontWeight: '700', isHeading: true });
    expect(typography.title3).toMatchObject({ fontSize: 20, fontWeight: '700', isHeading: true });
    for (const v of ['body', 'bodyStrong', 'headline', 'callout', 'label'] as const) expect(typography[v].fontSize).toBe(17);
    expect(typography.subheadline.fontSize).toBe(15);
    expect(typography.caption.fontSize).toBe(13);
    expect(typography.footnote.fontSize).toBe(13);
    const sizes = new Set(Object.values(typography).map((t) => t.fontSize));
    expect([...sizes].sort((a, b) => a - b)).toEqual([13, 15, 17, 20, 30, 34]);
  });

  it('métricas tabulares e tracking ≥ -0,04 em', () => {
    expect(typography.metricHero).toMatchObject({ fontSize: 34, tabular: true });
    expect(typography.metric).toMatchObject({ fontSize: 20, tabular: true });
    expect(typography.metricUnit).toMatchObject({ fontSize: 15, lineHeight: 20 });
    for (const t of Object.values(typography)) expect(t.letterSpacing).toBeGreaterThanOrEqual(-0.04 * t.fontSize);
  });

  it('Archivo SemiCondensed por peso, sem serifa', () => {
    expect(ARCHIVO).toEqual({ '400': 'ArchivoSC-Regular', '500': 'ArchivoSC-Medium', '600': 'ArchivoSC-SemiBold', '700': 'ArchivoSC-Bold' });
    expect(fontFamilyFor('600')).toBe('ArchivoSC-SemiBold');
    expect(fontFamilyFor('bold')).toBe('ArchivoSC-Bold');
    expect(fontFamilyFor(800)).toBe('ArchivoSC-Bold');
    expect(fontFamilyFor('300')).toBe('ArchivoSC-Regular');
    expect(normalizeWeight(undefined)).toBe('400');
    expect(normalizeWeight('500')).toBe('500');
    expect(JSON.stringify(typography)).not.toMatch(/serif/i);
  });

  it('nenhum texto abaixo de 13 pt', () => {
    for (const t of Object.values(typography)) expect(t.fontSize).toBeGreaterThanOrEqual(13);
  });

  it('raios e medidas da pasta', () => {
    expect(radii).toMatchObject({ container: 20, card: 16, field: 12, tile: 10, bar: 2, leaf: 16, tab: 8 });
    expect(space[7]).toBe(28);
    expect(layout).toMatchObject({ groupInset: 16, sectionHeaderTop: 28, sectionHeaderBottom: 10, rowMinHeight: 52, leafMargin: 20, railWidth: 40, tabMinHeight: 64 });
  });

  it('troca de divisória: 90 ms em 2 quadros', () => {
    expect(boardSwap).toEqual({ tab: 120, content: 150 });
  });

  it('fio ou sombra, nunca os dois', () => {
    expect(elevationStyle('light', 0, '#D5D8E6')).toEqual({ borderWidth: 1, borderColor: '#D5D8E6' });
    const floating = elevationStyle('light', 2, '#D5D8E6');
    expect(floating.borderWidth).toBeUndefined();
    expect(floating.boxShadow).toContain('rgba(20, 25, 70, 0.24)');
    expect(elevationStyle('dark', 2, '#383B4A')).toEqual({});
  });
});
