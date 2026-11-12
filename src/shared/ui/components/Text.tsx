import { Platform, Text as RNText, StyleSheet, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import type { TypographyVariant } from '../tokens';
import { useTheme } from '../theme';
import { resolveColor, type ColorRole } from './Icon';

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'inverse'
  | 'disabled'
  | 'link'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info'
  | 'onPrimary'
  | ColorRole;

const COLOR_ALIASES: Record<string, ColorRole> = {
  primary: 'textPrimary',
  secondary: 'textSecondary',
  tertiary: 'textTertiary',
  inverse: 'textInverse',
  disabled: 'textDisabled',
  link: 'primary',
};

export interface TextProps extends RNTextProps {
  /** Padrão 'body'. Títulos (display, title1-3) são anunciados como cabeçalho. */
  variant?: TypographyVariant;
  /** Padrão 'primary' (textPrimary). */
  color?: TextColor;
  align?: TextStyle['textAlign'];
  /** Números de largura fixa (datas, valores, código). Padrão: o da variante (metric* ligam). */
  tabular?: boolean;
}

/**
 * Texto do DS. v4: Archivo SemiCondensed com a família escolhida pelo peso (cada peso é um arquivo), inclusive
 * quando o chamador muda `fontWeight` no `style`. No Android o `fontWeight` sai do estilo (o arquivo já é o
 * peso; somar os dois faz negrito sintético).
 */
export function Text({ variant = 'body', color = 'primary', align, tabular, style, accessibilityRole, maxFontSizeMultiplier, ...rest }: TextProps) {
  const theme = useTheme();
  const t = theme.typography[variant];
  const tnum = tabular ?? t.tabular ?? false;
  const override = StyleSheet.flatten(style) as TextStyle | undefined;
  const weight = override?.fontWeight ?? t.fontWeight;
  const family = override?.fontFamily ?? theme.font(weight);
  const nativeWeight = Platform.OS === 'android' && theme.fontsLoaded && !override?.fontFamily ? undefined : weight;
  const textStyle: TextStyle = {
    fontSize: t.fontSize,
    lineHeight: t.lineHeight,
    // Android + fonte própria mede o letterSpacing de um jeito e desenha de outro: a linha estoura e a última palavra some.
    letterSpacing: Platform.OS === 'android' ? undefined : t.letterSpacing,
    color: resolveColor(theme.colors, COLOR_ALIASES[color] ?? color),
    textAlign: align,
    fontVariant: tnum ? ['tabular-nums'] : undefined,
  };
  // Achata e remove a chave de verdade: num array de estilo, `fontWeight: undefined` depois NÃO apaga o '600'
  // de quem chamou ao chegar no nativo, e o Android mede em negrito sintético e corta a última palavra.
  const { fontWeight: _callerWeight, ...rest0 } = { ...textStyle, ...override, fontFamily: family } as TextStyle;
  const merged: TextStyle = nativeWeight === undefined ? rest0 : { ...rest0, fontWeight: nativeWeight };
  return (
    <RNText
      allowFontScaling
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? t.maxFontSizeMultiplier}
      accessibilityRole={accessibilityRole ?? (t.isHeading ? 'header' : undefined)}
      style={merged}
      // Android + fonte própria: a quebra 'highQuality' mede a linha mais estreita do que desenha e corta a
      // última palavra ("Acima da" no lugar de "Acima da faixa"). 'simple' mede como desenha.
      textBreakStrategy={Platform.OS === 'android' ? 'simple' : undefined}
      {...rest}
    />
  );
}
