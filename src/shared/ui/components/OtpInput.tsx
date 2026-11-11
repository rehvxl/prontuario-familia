import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import { useTheme } from '../theme';
import { FieldLabel, FieldMessage } from './FieldMessage';
import { Text } from './Text';

export interface OtpInputProps {
  /** Apenas dígitos, 0..length caracteres. */
  value: string;
  onChange: (code: string) => void;
  /** Chamado uma vez quando o código fica completo (digitado, colado ou preenchido pelo SMS/e-mail). */
  onComplete?: (code: string) => void;
  /** Padrão 6. */
  length?: number;
  /** Padrão "Código de verificação". */
  label?: string;
  helper?: string;
  error?: string | null;
  disabled?: boolean;
  autoFocus?: boolean;
  testID?: string;
}

/** Mantém só dígitos e corta no tamanho: colar "123 456" ou "Seu código: 123456" funciona. */
export function sanitizeOtp(text: string, length: number): string {
  return text.replace(/\D/g, '').slice(0, length);
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  label = 'Código de verificação',
  helper,
  error,
  disabled = false,
  autoFocus = false,
  testID,
}: OtpInputProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);
  const digits = value.split('');
  const activeIndex = Math.min(value.length, length - 1);

  const handleChange = (text: string) => {
    const next = sanitizeOtp(text, length);
    if (next === value) return;
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };

  return (
    <View>
      <FieldLabel label={label} />
      <Pressable
        onPress={() => inputRef.current?.focus()}
        disabled={disabled}
        accessible={false}
        importantForAccessibility="no"
        style={[styles.row, { gap: theme.space[2] }]}
      >
        {Array.from({ length }, (_, i) => {
          const isActive = focused && i === activeIndex;
          const borderColor = error ? theme.colors.danger : isActive ? theme.colors.primary : theme.colors.borderStrong;
          return (
            <View
              key={i}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.cell,
                {
                  minHeight: 60,
                  borderRadius: theme.radii.md,
                  borderColor,
                  borderWidth: isActive || error ? 2 : 1,
                  backgroundColor: disabled ? theme.colors.surfaceSunken : theme.colors.surface,
                },
              ]}
            >
              <Text variant="title1" tabular maxFontSizeMultiplier={1.3}>
                {digits[i] ?? ''}
              </Text>
            </View>
          );
        })}
        <TextInput
          ref={inputRef}
          testID={testID}
          value={value}
          onChangeText={handleChange}
          editable={!disabled}
          autoFocus={autoFocus}
          keyboardType="number-pad"
          inputMode="numeric"
          textContentType="oneTimeCode"
          autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
          maxLength={length + 8 /* deixa colar com espaços; sanitizeOtp corta */}
          caretHidden
          contextMenuHidden={false}
          selectionColor="transparent"
          accessibilityLabel={`${label}, ${length} dígitos`}
          accessibilityHint={error ? `Erro: ${error}` : helper}
          accessibilityState={{ disabled }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.hiddenInput}
        />
      </Pressable>
      <FieldMessage helper={helper} error={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: { flex: 1, maxWidth: 56, alignItems: 'center', justifyContent: 'center' },
  // O TextInput real cobre as caixas: recebe toque, colar e autofill do código; fica invisível.
  hiddenInput: { ...StyleSheet.absoluteFill, color: 'transparent', opacity: 0.02, fontSize: 1 },
});
