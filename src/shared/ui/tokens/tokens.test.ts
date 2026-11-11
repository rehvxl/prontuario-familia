import { contrastRatio } from './contrast';
import { darkCategorical, darkColors, lightCategorical, lightColors, type ColorTokens } from './colors';

const AA_TEXT = 4.5;
const AA_UI = 3;

const textPairs: [keyof ColorTokens, keyof ColorTokens][] = [
  ['textPrimary', 'background'],
  ['textPrimary', 'surface'],
  ['textPrimary', 'surfaceRaised'],
  ['textSecondary', 'background'],
  ['textSecondary', 'surface'],
  ['textTertiary', 'background'],
  ['textTertiary', 'surface'],
  ['primary', 'surface'],
  ['primary', 'background'],
  ['onPrimary', 'primary'],
  ['onPrimarySoft', 'primarySoft'],
  ['onSuccessSoft', 'successSoft'],
  ['onWarningSoft', 'warningSoft'],
  ['onDangerSoft', 'dangerSoft'],
  ['onInfoSoft', 'infoSoft'],
  ['danger', 'surface'],
  ['onDanger', 'danger'],
  ['success', 'surface'],
  ['warning', 'surface'],
  ['info', 'surface'],
];

describe.each([
  ['claro', lightColors, lightCategorical],
  ['escuro', darkColors, darkCategorical],
] as const)('tokens de cor — tema %s', (_name, colors, categorical) => {
  it.each(textPairs)('%s sobre %s tem contraste AA (≥ 4.5:1)', (fg, bg) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('contorno de controles tem ≥ 3:1 sobre surface', () => {
    expect(contrastRatio(colors.borderStrong, colors.surface)).toBeGreaterThanOrEqual(AA_UI);
    expect(contrastRatio(colors.focusRing, colors.surface)).toBeGreaterThanOrEqual(AA_UI);
  });

  it('paleta categórica tem 7 cores com ≥ 3:1 sobre surface e texto legível sobre soft', () => {
    expect(categorical).toHaveLength(7);
    for (const c of categorical) {
      expect(contrastRatio(c.main, colors.surface)).toBeGreaterThanOrEqual(AA_UI);
      expect(contrastRatio(c.main, colors.background)).toBeGreaterThanOrEqual(AA_UI);
      expect(contrastRatio(c.main, c.soft)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(c.onMain, c.main)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});
