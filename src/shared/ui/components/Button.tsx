import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import type { ColorTokens } from '../tokens';
import { useTheme } from '../theme';
import { FocusRing, useFocusState } from '../lib/focus';
import { Icon } from './Icon';
import { Text } from './Text';
import { resolveButtonStyle, type ButtonProps, type ButtonRole, type ButtonStyleName } from './Button.types';

export type { ButtonProps, ButtonSize, ButtonVariant, ButtonStyleName, ButtonRole } from './Button.types';

interface VariantColors {
  bg: string;
  bgPressed: string;
  fg: keyof ColorTokens;
  ripple: string;
  border?: string;
}

/**
 * Material 3 (Android/web): glassProminent e filled → Filled button; glass e bordered → Filled tonal;
 * plain → Text button. Não imitamos vidro no Android.
 */
function variantColors(colors: ColorTokens, style: ButtonStyleName, role: ButtonRole): VariantColors {
  const destructive = role === 'destructive';
  switch (style) {
    case 'glass':
    case 'bordered':
      return destructive
        ? { bg: colors.dangerSoft, bgPressed: colors.surfaceSunken, fg: 'onDangerSoft', ripple: colors.border }
        : { bg: colors.primarySoft, bgPressed: colors.surfaceSunken, fg: 'onPrimarySoft', ripple: colors.border };
    case 'plain':
      return {
        bg: 'transparent',
        bgPressed: destructive ? colors.dangerSoft : colors.primarySoft,
        fg: destructive ? 'danger' : 'primary',
        ripple: destructive ? colors.dangerSoft : colors.primarySoft,
      };
    default:
      return destructive
        ? { bg: colors.danger, bgPressed: colors.dangerPressed, fg: 'onDanger', ripple: colors.dangerPressed }
        : { bg: colors.primary, bgPressed: colors.primaryPressed, fg: 'onPrimary', ripple: colors.primaryPressed };
  }
}

export function Button({
  label,
  onPress,
  variant = 'filled',
  role: roleProp,
  size = 'md',
  icon,
  iconPosition = 'start',
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const focus = useFocusState();
  const { style: resolved, role } = resolveButtonStyle(variant, roleProp);
  const inactive = disabled || loading;
  const c = variantColors(theme.colors, resolved, role);
  const fg: keyof ColorTokens = disabled ? 'textDisabled' : c.fg;
  const minHeight = size === 'md' ? theme.layout.controlHeight : theme.minTouchTarget;
  const radius = minHeight / 2;

  const leading = loading ? (
    <ActivityIndicator size="small" color={theme.colors[fg]} />
  ) : icon && iconPosition === 'start' ? (
    <Icon name={icon} size={20} color={fg} />
  ) : null;
  const trailing = !loading && icon && iconPosition === 'end' ? <Icon name={icon} size={20} color={fg} /> : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      android_ripple={inactive ? undefined : { color: c.ripple }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight,
          borderRadius: radius,
          paddingHorizontal: size === 'md' ? theme.space[6] : theme.space[4],
          backgroundColor:
            disabled && resolved !== 'plain'
              ? theme.colors.surfaceSunken
              : pressed && Platform.OS !== 'android'
                ? c.bgPressed
                : c.bg,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      <View style={[styles.content, { gap: theme.space[2] }]}>
        {leading}
        {/* Cor direta do token: em <Text>, color="primary" é o texto principal (preto), não o `care`. */}
        <Text variant="label" align="center" style={[styles.label, { color: theme.colors[fg] }]}>
          {label}
        </Text>
        {trailing}
      </View>
      <FocusRing visible={focus.focused} radius={radius} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { justifyContent: 'center', alignItems: 'center', overflow: 'hidden', paddingVertical: 12 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexShrink: 1 },
  label: { flexShrink: 1 },
});
