import { useState, type Ref } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type TextInputInstance, type TextInputProps, type ViewStyle } from 'react-native';
import { fontFamily } from '../tokens';
import { useTheme } from '../theme';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

export interface SearchFieldProps extends Omit<TextInputProps, 'style' | 'onChangeText' | 'value' | 'placeholderTextColor'> {
  value: string;
  onChangeText: (text: string) => void;
  /** Disparado pelo botão "Buscar" do teclado. */
  onSubmit?: (text: string) => void;
  /** Padrão "Buscar exames, médicos, locais". */
  placeholder?: string;
  /** Chamado depois de limpar. */
  onClear?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  ref?: Ref<TextInputInstance>;
}

export function SearchField({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Buscar exames, médicos, locais',
  onClear,
  containerStyle,
  ref,
  ...inputProps
}: SearchFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const t = theme.typography.body;
  return (
    <View
      accessibilityRole="search"
      style={[
        styles.box,
        {
          minHeight: theme.layout.controlHeight,
          borderRadius: theme.layout.controlHeight / 2,
          backgroundColor: theme.colors.surface,
          borderColor: focused ? theme.colors.primary : theme.colors.borderStrong,
          borderWidth: focused ? 2 : 1,
          paddingLeft: theme.space[3] - (focused ? 1 : 0),
          gap: theme.space[2],
        },
        containerStyle,
      ]}
    >
      <Icon name="search" size={20} color="textSecondary" />
      <TextInput
        ref={ref}
        {...inputProps}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={(e) => onSubmit?.(e.nativeEvent.text)}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
        selectionColor={theme.colors.primary}
        cursorColor={theme.colors.primary}
        accessibilityLabel={inputProps.accessibilityLabel ?? 'Buscar'}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
        allowFontScaling
        maxFontSizeMultiplier={t.maxFontSizeMultiplier}
        onFocus={(e) => {
          setFocused(true);
          inputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          inputProps.onBlur?.(e);
        }}
        style={[styles.input, { fontFamily, fontSize: t.fontSize, color: theme.colors.textPrimary }]}
      />
      {value.length > 0 ? (
        <IconButton
          icon="close-circle"
          iconSize={22}
          color="textSecondary"
          accessibilityLabel="Limpar busca"
          onPress={() => {
            onChangeText('');
            onClear?.();
          }}
        />
      ) : (
        <View style={{ width: theme.space[2] }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, alignSelf: 'stretch', paddingVertical: 8 },
});
