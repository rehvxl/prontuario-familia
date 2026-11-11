import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import type { ColorTokens } from '../tokens';
import { useTheme } from '../theme';
import { FocusRing, useFocusState } from '../lib/focus';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps {
  /** Texto do botão: um verbo que nomeia a ação ("Salvar registro", não "OK"). */
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  /** md = 52 pt (padrão); sm = altura mínima de toque da plataforma. */
  size?: ButtonSize;
  icon?: IconName;
  iconPosition?: 'start' | 'end';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface VariantColors {
  bg: string;
  bgPressed: string;
  fg: keyof ColorTokens;
  ripple: string;
}

function variantColors(colors: ColorTokens, variant: ButtonVariant): VariantColors {
  switch (variant) {
    case 'secondary':
      return { bg: colors.primarySoft, bgPressed: colors.surfaceSunken, fg: 'onPrimarySoft', ripple: colors.border };
    case 'ghost':
      return { bg: 'transparent', bgPressed: colors.primarySoft, fg: 'primary', ripple: colors.primarySoft };
    case 'destructive':
      return { bg: colors.danger, bgPressed: colors.dangerPressed, fg: 'onDanger', ripple: colors.dangerPressed };
    default:
      return { bg: colors.primary, bgPressed: colors.primaryPressed, fg: 'onPrimary', ripple: colors.primaryPressed };
  }
}

export function Button({
  label,
  onPress,
  variant = 'primary',
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
  const inactive = disabled || loading;
  const c = variantColors(theme.colors, variant);
  const fg: keyof ColorTokens = disabled ? 'textDisabled' : c.fg;
  const minHeight = size === 'md' ? theme.layout.controlHeight : theme.minTouchTarget;
  const radius = theme.radii.md;

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
      android_ripple={variant === 'ghost' || inactive ? undefined : { color: c.ripple }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight,
          borderRadius: radius,
          paddingHorizontal: size === 'md' ? theme.space[5] : theme.space[4],
          backgroundColor: disabled ? theme.colors.surfaceSunken : pressed && Platform.OS !== 'android' ? c.bgPressed : c.bg,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        variant === 'ghost' && pressed && Platform.OS === 'android' && { backgroundColor: c.bgPressed },
        style,
      ]}
    >
      <View style={[styles.content, { gap: theme.space[2] }]}>
        {leading}
        <Text variant="label" color={fg} align="center" style={styles.label}>
          {label}
        </Text>
        {trailing}
      </View>
      <FocusRing visible={focus.focused} radius={radius} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { justifyContent: 'center', alignItems: 'center', overflow: Platform.OS === 'android' ? 'hidden' : 'visible', paddingVertical: 12 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexShrink: 1 },
  label: { flexShrink: 1 },
});
