import { Platform, Pressable, Switch as RNSwitch, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { selectionFeedback } from '../lib/haptics';
import { Text } from './Text';

export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Rótulo da linha; toda a linha alterna (alvo grande). */
  label: string;
  /** Explicação curta abaixo do rótulo ("Avisa um dia antes da consulta"). */
  description?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Interruptor liga/desliga para efeito imediato (preferências). O controle é o nativo
 * (UISwitch com Liquid Glass no iOS 26, Material 3 no Android); a linha inteira é o alvo de toque.
 * Para aceitar termos ou marcar itens, use Checkbox.
 */
export function Switch({ value, onValueChange, label, description, disabled = false, style, testID }: SwitchProps) {
  const theme = useTheme();
  const toggle = () => {
    if (disabled) return;
    selectionFeedback();
    onValueChange(!value);
  };
  return (
    <Pressable
      onPress={toggle}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
      android_ripple={{ color: theme.colors.border }}
      testID={testID}
      style={[styles.row, { minHeight: description ? 64 : 52, gap: theme.space[3], paddingVertical: theme.space[2] }, style]}
    >
      <View style={styles.flex}>
        <Text variant="body" color={disabled ? 'disabled' : 'primary'}>
          {label}
        </Text>
        {description ? (
          <Text variant="subheadline" color="secondary">
            {description}
          </Text>
        ) : null}
      </View>
      <RNSwitch
        value={value}
        onValueChange={() => toggle()}
        disabled={disabled}
        trackColor={Platform.OS === 'ios' ? { true: theme.colors.primary, false: undefined } : { true: theme.colors.primary, false: theme.colors.surfaceSunken }}
        thumbColor={Platform.OS === 'android' ? (value ? theme.colors.onPrimary : theme.colors.borderStrong) : undefined}
        // A linha já anuncia; o controle interno fica fora da árvore de acessibilidade.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
