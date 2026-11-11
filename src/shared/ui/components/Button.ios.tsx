import { Host, Button as SwiftButton, HStack, Image as SwiftImage, ProgressView, Text as SwiftText } from '@expo/ui/swift-ui';
import {
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled as disabledMod,
  font,
  frame,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { resolveIcon } from './Icon';
import { resolveButtonStyle, syntheticPress, type ButtonProps, type ButtonStyleName } from './Button.types';

export type { ButtonProps, ButtonSize, ButtonVariant, ButtonStyleName, ButtonRole } from './Button.types';

/** Estilo SwiftUI. Sem Liquid Glass (iOS < 26 ou Reduzir transparência): glass → bordered sólido. */
function swiftStyle(style: ButtonStyleName, glass: boolean) {
  switch (style) {
    case 'glassProminent':
      return glass ? 'glassProminent' : 'borderedProminent';
    case 'glass':
      return glass ? 'glass' : 'bordered';
    case 'filled':
      return 'borderedProminent';
    case 'bordered':
      return 'bordered';
    default:
      return 'borderless';
  }
}

/**
 * Botão nativo (SwiftUI) em cápsula, com Liquid Glass no iOS 26. O invólucro RN carrega papel, rótulo e
 * estado para VoiceOver e testes; o botão SwiftUI cuida do toque, do realce e do Dynamic Type.
 */
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
  const { style: resolved, role } = resolveButtonStyle(variant, roleProp);
  const inactive = disabled || loading;
  const color = role === 'destructive' ? theme.colors.danger : theme.colors.primary;
  const minHeight = size === 'md' ? theme.layout.controlHeight : theme.minTouchTarget;
  const systemImage = icon && iconPosition === 'start' && !loading ? resolveIcon(icon)?.sf : undefined;
  const trailingImage = icon && iconPosition === 'end' && !loading ? resolveIcon(icon)?.sf : undefined;
  const press = () => {
    if (!inactive) onPress?.(syntheticPress);
  };

  const labelModifiers = [
    font({ textStyle: 'headline', weight: 'semibold' }),
    frame({ maxWidth: fullWidth ? Infinity : undefined }),
  ];

  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'activate') press();
      }}
      testID={testID}
      style={[{ minHeight, alignSelf: fullWidth ? 'stretch' : 'flex-start' }, styles.wrap, style]}
    >
      <Host matchContents={fullWidth ? { vertical: true } : true} style={fullWidth ? styles.stretch : undefined}>
        <SwiftButton
          onPress={press}
          role={role === 'default' ? undefined : role}
          modifiers={[
            buttonStyle(swiftStyle(resolved, theme.glass.enabled)),
            buttonBorderShape('capsule'),
            controlSize(size === 'md' ? 'large' : 'regular'),
            tint(color),
            disabledMod(inactive),
          ]}
        >
          <HStack spacing={8} modifiers={labelModifiers}>
            {loading ? <ProgressView /> : null}
            {systemImage ? <SwiftImage systemName={systemImage} /> : null}
            <SwiftText>{label}</SwiftText>
            {trailingImage ? <SwiftImage systemName={trailingImage} /> : null}
          </HStack>
        </SwiftButton>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center' },
  stretch: { alignSelf: 'stretch' },
});
