import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { formatDate, parseISODate, toISODate } from '../lib/date';
import { FocusRing, useFocusState } from '../lib/focus';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { FieldLabel, FieldMessage, fieldAccessibilityHint } from './FieldMessage';
import { Icon } from './Icon';
import { Text } from './Text';

export interface DateFieldProps {
  label: string;
  /** Data de calendário 'YYYY-MM-DD' ou null. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** 'YYYY-MM-DD'. */
  minimumDate?: string;
  /** 'YYYY-MM-DD'. Para datas de atendimento, passe a data de hoje. */
  maximumDate?: string;
  /** Padrão "Selecionar data". */
  placeholder?: string;
  helper?: string;
  error?: string | null;
  optional?: boolean;
  /** Mostra "Limpar data" na folha (iOS) quando há valor e o campo é opcional. */
  clearable?: boolean;
  disabled?: boolean;
  testID?: string;
}

export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  placeholder = 'Selecionar data',
  helper,
  error,
  optional,
  clearable = optional,
  disabled = false,
  testID,
}: DateFieldProps) {
  const theme = useTheme();
  const focus = useFocusState();
  const [open, setOpen] = useState(false);
  const selected = parseISODate(value);
  const min = parseISODate(minimumDate) ?? undefined;
  const max = parseISODate(maximumDate) ?? undefined;
  const [draft, setDraft] = useState<Date>(selected ?? max ?? new Date());
  const display = formatDate(value, 'long');

  const openPicker = () => {
    const initial = selected ?? max ?? new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        minimumDate: min,
        maximumDate: max,
        positiveButton: { label: 'Concluir' },
        negativeButton: { label: 'Cancelar' },
        onValueChange: (_event, date) => onChange(toISODate(date)),
      });
      return;
    }
    setDraft(initial);
    setOpen(true);
  };

  return (
    <View>
      <FieldLabel label={label} optional={optional} />
      <Pressable
        onPress={openPicker}
        disabled={disabled}
        onFocus={focus.onFocus}
        onBlur={focus.onBlur}
        accessibilityRole="button"
        accessibilityLabel={`${label}${optional ? ', opcional' : ''}: ${display || 'nenhuma data'}`}
        accessibilityHint={fieldAccessibilityHint(helper, error) ?? 'Abre o calendário'}
        accessibilityState={{ disabled, expanded: open }}
        testID={testID}
        style={({ pressed }) => [
          styles.field,
          {
            minHeight: theme.layout.controlHeight,
            borderRadius: theme.radii.md,
            borderWidth: error ? 2 : 1,
            borderColor: error ? theme.colors.danger : theme.colors.borderStrong,
            paddingHorizontal: theme.space[4] - (error ? 1 : 0),
            gap: theme.space[2],
            backgroundColor: disabled ? theme.colors.surfaceSunken : pressed && Platform.OS !== 'android' ? theme.colors.surfaceSunken : theme.colors.surface,
          },
        ]}
      >
        <Icon name="calendar-outline" size={20} color="textSecondary" />
        <Text variant="body" color={display ? (disabled ? 'disabled' : 'primary') : 'tertiary'} tabular style={styles.flex}>
          {display || placeholder}
        </Text>
        <FocusRing visible={focus.focused} radius={theme.radii.md} />
      </Pressable>
      <FieldMessage helper={helper} error={error} />

      {Platform.OS === 'ios' ? (
        <BottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
          <DateTimePicker
            value={draft}
            mode="date"
            display="inline"
            locale="pt-BR"
            minimumDate={min}
            maximumDate={max}
            accentColor={theme.colors.primary}
            themeVariant={theme.scheme}
            onValueChange={(_event, date) => setDraft(date)}
          />
          <View style={[styles.actions, { gap: theme.space[3], marginTop: theme.space[3] }]}>
            {clearable && value ? (
              <Button
                label="Limpar data"
                variant="ghost"
                onPress={() => {
                  onChange(null);
                  setOpen(false);
                }}
                style={styles.flex}
              />
            ) : null}
            <Button
              label="Concluir"
              onPress={() => {
                onChange(toISODate(draft));
                setOpen(false);
              }}
              style={styles.flex}
            />
          </View>
        </BottomSheet>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center' },
  actions: { flexDirection: 'row' },
  flex: { flex: 1 },
});
