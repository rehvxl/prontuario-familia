import { Platform, Pressable, StyleSheet, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import type { ColorTokens } from '../tokens';
import { useTheme } from '../theme';
import { FocusRing, useFocusState } from '../lib/focus';
import { GlassSurface } from './GlassSurface';
import { Icon, type IconName } from './Icon';

/** v2: 'glass' = círculo de vidro para ações sobre conteúdo (fechar sobre foto, voltar sobre visualizador). */
export type IconButtonVariant = 'plain' | 'tonal' | 'filled' | 'glass';

export interface IconButtonProps {
  icon: IconName;
  /** Obrigatório: o que o botão faz ("Fechar", "Compartilhar documento"). */
  accessibilityLabel: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: IconButtonVariant;
  /** Cor do ícone na variante plain. Padrão 'textPrimary'. */
  color?: keyof ColorTokens;
  iconSize?: number;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'plain',
  color = 'textPrimary',
  iconSize = 24,
  disabled = false,
  accessibilityHint,
  style,
  testID,
}: IconButtonProps) {
  const theme = useTheme();
  const focus = useFocusState();
  const size = theme.minTouchTarget;
  const bg = variant === 'filled' ? theme.colors.primary : variant === 'tonal' ? theme.colors.primarySoft : 'transparent';
  const fg: keyof ColorTokens = disabled ? 'textDisabled' : variant === 'filled' ? 'onPrimary' : variant === 'tonal' ? 'onPrimarySoft' : color;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      android_ripple={{ color: theme.colors.border, borderless: variant === 'plain', radius: size / 2 }}
      hitSlop={4}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        pressed && Platform.OS !== 'android' && { opacity: 0.6 },
        style,
      ]}
    >
      {variant === 'glass' ? (
        <GlassSurface shape="circle" interactive style={[StyleSheet.absoluteFill, styles.base]}>
          <Icon name={icon} size={iconSize - 2} weight="semibold" color={fg} />
        </GlassSurface>
      ) : (
        <Icon name={icon} size={iconSize} color={fg} />
      )}
      <FocusRing visible={focus.focused} radius={size / 2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
