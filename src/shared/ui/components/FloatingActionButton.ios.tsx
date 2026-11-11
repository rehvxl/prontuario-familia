import { Host, Button as SwiftButton, HStack, Image as SwiftImage, Text as SwiftText } from '@expo/ui/swift-ui';
import { buttonBorderShape, buttonStyle, controlSize, disabled as disabledMod, font, tint } from '@expo/ui/swift-ui/modifiers';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { resolveIcon } from './Icon';
import type { FloatingActionButtonProps } from './FloatingActionButton.types';

export type { FloatingActionButtonProps } from './FloatingActionButton.types';

/**
 * Ação primária flutuante (iOS): botão SwiftUI `glassProminent` em cápsula/círculo, tingido de azul.
 * Sem Liquid Glass: `borderedProminent` sólido. Posicione com `position: 'absolute'` no pai,
 * acima da barra de abas (o expo-router NativeTabs já reserva a área segura).
 */
export function FloatingActionButton({ icon, label, onPress, extended = false, disabled = false, accessibilityHint, testID }: FloatingActionButtonProps) {
  const theme = useTheme();
  const sf = resolveIcon(icon)?.sf ?? 'plus';
  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'activate' && !disabled) onPress();
      }}
      testID={testID}
      style={{ alignSelf: 'flex-end', minHeight: 56, minWidth: 56 }}
    >
      <Host matchContents colorScheme={theme.scheme}>
        <SwiftButton
          onPress={disabled ? undefined : onPress}
          modifiers={[
            buttonStyle(theme.glass.enabled ? 'glassProminent' : 'borderedProminent'),
            buttonBorderShape(extended ? 'capsule' : 'circle'),
            controlSize('extraLarge'),
            tint(theme.colors.primary),
            disabledMod(disabled),
          ]}
        >
          <HStack spacing={8} modifiers={[font({ textStyle: 'headline', weight: 'semibold' })]}>
            <SwiftImage systemName={sf} />
            {extended ? <SwiftText>{label}</SwiftText> : null}
          </HStack>
        </SwiftButton>
      </Host>
    </View>
  );
}
