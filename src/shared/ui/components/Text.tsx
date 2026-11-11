import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { fontFamily, fontFamilyMedium, type TypographyVariant } from '../tokens';
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
  /** Números de largura fixa (datas, valores, código). */
  tabular?: boolean;
}

export function Text({ variant = 'body', color = 'primary', align, tabular, style, accessibilityRole, maxFontSizeMultiplier, ...rest }: TextProps) {
  const theme = useTheme();
  const t = theme.typography[variant];
  const isMedium = t.fontWeight === '500' || t.fontWeight === '600';
  const textStyle: TextStyle = {
    fontFamily: isMedium ? fontFamilyMedium : fontFamily,
    fontSize: t.fontSize,
    lineHeight: t.lineHeight,
    fontWeight: t.fontWeight,
    letterSpacing: t.letterSpacing,
    color: resolveColor(theme.colors, COLOR_ALIASES[color] ?? color),
    textAlign: align,
    fontVariant: tabular ? ['tabular-nums'] : undefined,
  };
  return (
    <RNText
      allowFontScaling
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? t.maxFontSizeMultiplier}
      accessibilityRole={accessibilityRole ?? (t.isHeading ? 'header' : undefined)}
      style={[textStyle, style]}
      {...rest}
    />
  );
}
