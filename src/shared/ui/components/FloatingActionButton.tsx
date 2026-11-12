import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { FocusRing, useFocusState } from '../lib/focus';
import { Icon } from './Icon';
import { Text } from './Text';
import type { FloatingActionButtonProps } from './FloatingActionButton.types';

export type { FloatingActionButtonProps } from './FloatingActionButton.types';

/**
 * FAB Material 3 (Android/web), v4: 56 dp, cantos de 16, sólido na tinta da divisória (`primary`), sombra "Flutuante",
 * ripple. Estendido mostra o rótulo. Sem vidro.
 */
export function FloatingActionButton({ icon, label, onPress, extended = false, disabled = false, accessibilityHint, testID }: FloatingActionButtonProps) {
  const theme = useTheme();
  const focus = useFocusState();
  return (
    <View style={[styles.wrap, theme.elevation(2), { borderRadius: 16 }]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onFocus={focus.onFocus}
        onBlur={focus.onBlur}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        android_ripple={{ color: theme.colors.primaryPressed, foreground: true }}
        testID={testID}
        style={[
          styles.fab,
          {
            backgroundColor: disabled ? theme.colors.surfaceSunken : theme.colors.primary,
            paddingHorizontal: extended ? 20 : 0,
            width: extended ? undefined : 56,
          },
        ]}
      >
        <Icon name={icon} size={24} color={disabled ? 'textDisabled' : 'onPrimary'} />
        {extended ? (
          <Text variant="bodyStrong" color={disabled ? 'disabled' : 'onPrimary'}>
            {label}
          </Text>
        ) : null}
        <FocusRing visible={focus.focused} radius={16} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-end' },
  fab: { minHeight: 56, borderRadius: 16, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
});
