import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { FocusRing, useFocusState } from '../lib/focus';
import { selectionFeedback } from '../lib/haptics';
import { BottomSheet } from './BottomSheet';
import { FieldLabel, FieldMessage, fieldAccessibilityHint } from './FieldMessage';
import { Icon } from './Icon';
import { Text } from './Text';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export interface SelectProps<T extends string> {
  label: string;
  options: readonly SelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Padrão "Selecionar". */
  placeholder?: string;
  helper?: string;
  error?: string | null;
  optional?: boolean;
  disabled?: boolean;
  testID?: string;
}

/**
 * Campo que abre uma folha com opções únicas. Implementação Android/web do `Select` e fallback do iOS
 * quando alguma opção tem `description` (menus nativos não mostram descrição).
 */
export function SelectSheet<T extends string>({ label, options, value, onChange, placeholder = 'Selecionar', helper, error, optional, disabled = false, testID }: SelectProps<T>) {
  const theme = useTheme();
  const focus = useFocusState();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? null;

  return (
    <View>
      <FieldLabel label={label} optional={optional} />
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        onFocus={focus.onFocus}
        onBlur={focus.onBlur}
        accessibilityRole="button"
        accessibilityLabel={`${label}${optional ? ', opcional' : ''}: ${current ? current.label : 'nenhum selecionado'}`}
        accessibilityHint={fieldAccessibilityHint(helper, error) ?? 'Abre a lista de opções'}
        accessibilityState={{ disabled, expanded: open }}
        testID={testID}
        style={({ pressed }) => [
          styles.field,
          {
            minHeight: theme.layout.controlHeight,
            borderRadius: theme.radii.field,
            borderWidth: error ? 2 : 1,
            borderColor: error ? theme.colors.danger : theme.colors.borderStrong,
            paddingHorizontal: theme.space[4] - (error ? 1 : 0),
            backgroundColor: disabled ? theme.colors.surfaceSunken : pressed && Platform.OS !== 'android' ? theme.colors.surfaceSunken : theme.colors.surface,
          },
        ]}
      >
        <Text variant="body" color={current ? (disabled ? 'disabled' : 'primary') : 'tertiary'} style={styles.flex}>
          {current ? current.label : placeholder}
        </Text>
        <Icon name="expand" size={18} weight="semibold" color="textSecondary" />
        <FocusRing visible={focus.focused} radius={theme.radii.field} />
      </Pressable>
      <FieldMessage helper={helper} error={error} />

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
        <ScrollView style={{ maxHeight: 420 }} accessibilityRole="radiogroup">
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  selectionFeedback();
                  onChange(opt.value);
                  setOpen(false);
                }}
                accessibilityRole="radio"
                accessibilityLabel={opt.label}
                accessibilityHint={opt.description}
                accessibilityState={{ checked: selected }}
                android_ripple={{ color: theme.colors.border }}
                style={({ pressed }) => [
                  styles.option,
                  { minHeight: 56, gap: theme.space[3], paddingHorizontal: theme.space[2], borderRadius: theme.radii.md },
                  selected && { backgroundColor: theme.colors.primarySoft },
                  pressed && !selected && Platform.OS !== 'android' && { backgroundColor: theme.colors.surfaceSunken },
                ]}
              >
                <View style={styles.flex}>
                  <Text variant={selected ? 'bodyStrong' : 'body'} color={selected ? 'onPrimarySoft' : 'primary'}>
                    {opt.label}
                  </Text>
                  {opt.description ? (
                    <Text variant="subheadline" color={selected ? 'onPrimarySoft' : 'secondary'}>
                      {opt.description}
                    </Text>
                  ) : null}
                </View>
                {selected ? <Icon name="check" size={20} weight="semibold" color="onPrimarySoft" /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  flex: { flex: 1 },
});
