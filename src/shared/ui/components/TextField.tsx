import { useState, type Ref } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type TextInputInstance, type TextInputProps, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { FieldLabel, FieldMessage, fieldAccessibilityHint } from './FieldMessage';
import { Icon, type IconName } from './Icon';

export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'editable' | 'placeholderTextColor'> {
  /** Rótulo visível (obrigatório). */
  label: string;
  helper?: string;
  /** Mensagem de erro: diz o problema e como resolver ("Informe uma data até hoje"). */
  error?: string | null;
  /** Mostra "(opcional)" ao lado do rótulo. Campos obrigatórios não levam marca. */
  optional?: boolean;
  disabled?: boolean;
  leadingIcon?: IconName;
  containerStyle?: StyleProp<ViewStyle>;
  ref?: Ref<TextInputInstance>;
}

export function TextField({
  label,
  helper,
  error,
  optional,
  disabled = false,
  leadingIcon,
  multiline,
  containerStyle,
  onFocus,
  onBlur,
  ref,
  ...inputProps
}: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? theme.colors.danger : focused ? theme.colors.primary : theme.colors.borderStrong;
  const borderWidth = error || focused ? 2 : 1;
  const t = theme.typography.body;

  return (
    <View style={containerStyle}>
      <FieldLabel label={label} optional={optional} />
      <View
        style={[
          styles.box,
          {
            minHeight: multiline ? 120 : theme.layout.controlHeight,
            borderRadius: theme.radii.field,
            borderColor,
            borderWidth,
            // compensa a borda para o texto não "pular" no foco
            paddingHorizontal: theme.space[4] - (borderWidth - 1),
            backgroundColor: disabled ? theme.colors.surfaceSunken : theme.colors.surface,
            gap: theme.space[2],
            alignItems: multiline ? 'flex-start' : 'center',
          },
        ]}
      >
        {leadingIcon ? <Icon name={leadingIcon} size={20} color="textSecondary" /> : null}
        <TextInput
          ref={ref}
          {...inputProps}
          multiline={multiline}
          editable={!disabled}
          accessibilityLabel={inputProps.accessibilityLabel ?? (optional ? `${label}, opcional` : label)}
          accessibilityHint={inputProps.accessibilityHint ?? fieldAccessibilityHint(helper, error)}
          accessibilityState={{ disabled }}
          aria-invalid={error ? true : undefined}
          placeholderTextColor={theme.colors.textTertiary}
          selectionColor={theme.colors.primary}
          cursorColor={theme.colors.primary}
          allowFontScaling
          maxFontSizeMultiplier={t.maxFontSizeMultiplier}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              fontFamily: theme.font('400'),
              fontSize: t.fontSize,
              lineHeight: multiline ? t.lineHeight : undefined,
              color: disabled ? theme.colors.textDisabled : theme.colors.textPrimary,
              paddingVertical: multiline ? theme.space[3] : theme.space[2],
            },
          ]}
        />
      </View>
      <FieldMessage helper={helper} error={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row' },
  input: { flex: 1, alignSelf: 'stretch' },
});
