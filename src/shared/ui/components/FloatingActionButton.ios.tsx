import { Host, Button as SwiftButton, HStack, Image as SwiftImage, Text as SwiftText } from '@expo/ui/swift-ui';
import { buttonBorderShape, buttonStyle, controlSize, disabled as disabledMod, font, foregroundStyle, tint } from '@expo/ui/swift-ui/modifiers';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { prominentForeground } from './Button.types';
import { resolveIcon } from './Icon';
import type { FloatingActionButtonProps } from './FloatingActionButton.types';

export type { FloatingActionButtonProps } from './FloatingActionButton.types';

/**
 * Ação primária flutuante (iOS), v4: botão SwiftUI `borderedProminent` sólido na tinta da divisória (`primary`), em
 * cápsula/círculo, com a sombra "Flutuante" no invólucro (só no claro). Sem vidro, também no iOS 26.
 * Posicione com `position: 'absolute'` no pai, acima da barra de abas.
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
      style={[{ alignSelf: 'flex-end', minHeight: 52, minWidth: 52, borderRadius: theme.radii.control }, theme.elevation(2)]}
    >
      <Host matchContents colorScheme={theme.scheme}>
        <SwiftButton
          onPress={disabled ? undefined : onPress}
          modifiers={[
            buttonStyle('borderedProminent'),
            buttonBorderShape(extended ? 'capsule' : 'circle'),
            controlSize('extraLarge'),
            tint(theme.colors.primary),
            disabledMod(disabled),
          ]}
        >
          <HStack spacing={8} modifiers={[
              font({ textStyle: 'headline', weight: 'semibold', ...(theme.fontsLoaded ? { family: theme.font('600') } : {}) }),
              // Sem isso o SwiftUI usa branco, que não passa sobre o `primary` claro do escuro (BUG-05).
              ...(disabled ? [] : [foregroundStyle(prominentForeground(theme.colors))]),
            ]}>
            <SwiftImage systemName={sf} />
            {extended ? <SwiftText>{label}</SwiftText> : null}
          </HStack>
        </SwiftButton>
      </Host>
    </View>
  );
}
