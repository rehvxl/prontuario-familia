import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { FocusRing, useFocusState } from '../lib/focus';
import { selectionFeedback } from '../lib/haptics';
import { FieldMessage } from './FieldMessage';
import { Icon } from './Icon';
import { Text } from './Text';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Texto da opção. A linha inteira é tocável. */
  label: string;
  /** Detalhe abaixo do rótulo (ex.: o que o consentimento cobre). */
  description?: string;
  /** Erro ligado ao aceite ("Para continuar, aceite o tratamento dos dados de saúde"). */
  error?: string | null;
  disabled?: boolean;
  testID?: string;
}

export function Checkbox({ checked, onChange, label, description, error, disabled = false, testID }: CheckboxProps) {
  const theme = useTheme();
  const focus = useFocusState();
  const boxColor = disabled ? theme.colors.textDisabled : error ? theme.colors.danger : checked ? theme.colors.primary : theme.colors.borderStrong;
  return (
    <View>
      <Pressable
        onPress={() => {
          selectionFeedback();
          onChange(!checked);
        }}
        disabled={disabled}
        onFocus={focus.onFocus}
        onBlur={focus.onBlur}
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityHint={error ? `Erro: ${error}` : description}
        // Sempre booleano: sem `checked` explícito o VoiceOver lê a linha desmarcada sem estado (A8).
        accessibilityState={{ checked: checked === true, disabled }}
        testID={testID}
        style={({ pressed }) => [
          styles.row,
          { minHeight: theme.minTouchTarget, gap: theme.space[3], paddingVertical: theme.space[2] },
          pressed && Platform.OS !== 'android' && { opacity: 0.7 },
        ]}
      >
        <View
          style={[
            styles.box,
            {
              borderRadius: theme.radii.sm,
              borderColor: boxColor,
              backgroundColor: checked ? boxColor : theme.colors.surface,
            },
          ]}
        >
          {checked ? <Icon name="check" size={16} weight="bold" color={disabled ? 'surface' : 'onPrimary'} /> : null}
        </View>
        <View style={styles.text}>
          <Text variant="body" color={disabled ? 'disabled' : 'primary'}>
            {label}
          </Text>
          {description ? (
            <Text variant="subheadline" color="secondary" style={{ marginTop: theme.space[1] }}>
              {description}
            </Text>
          ) : null}
        </View>
        <FocusRing visible={focus.focused} radius={theme.radii.sm} />
      </Pressable>
      {error ? (
        <View style={{ paddingLeft: 28 + theme.space[3] }}>
          <FieldMessage error={error} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  box: { width: 28, height: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: -2 },
  text: { flex: 1, paddingTop: 1 },
});
