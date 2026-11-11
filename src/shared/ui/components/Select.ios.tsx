import { MenuView } from '@expo/ui/community/menu';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { selectionFeedback } from '../lib/haptics';
import { FieldLabel, FieldMessage, fieldAccessibilityHint } from './FieldMessage';
import { Icon } from './Icon';
import { SelectSheet, type SelectProps } from './SelectSheet';
import { Text } from './Text';

export type { SelectOption, SelectProps } from './SelectSheet';

/**
 * iOS: o campo abre um menu nativo (SwiftUI `Menu`, com vidro no iOS 26) com a opção atual marcada —
 * o padrão do Ajustes/Saúde para escolha única curta. Se alguma opção tiver `description`, usa a folha.
 */
export function Select<T extends string>(props: SelectProps<T>) {
  const { label, options, value, onChange, placeholder = 'Selecionar', helper, error, optional, disabled = false, testID } = props;
  const theme = useTheme();
  if (options.some((o) => o.description)) return <SelectSheet {...props} />;
  const current = options.find((o) => o.value === value) ?? null;

  const field = (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${label}${optional ? ', opcional' : ''}: ${current ? current.label : 'nenhum selecionado'}`}
      accessibilityHint={fieldAccessibilityHint(helper, error) ?? 'Abre a lista de opções'}
      accessibilityState={{ disabled }}
      style={[
        styles.field,
        {
          minHeight: theme.layout.controlHeight,
          borderRadius: theme.radii.field,
          borderWidth: error ? 2 : 1,
          borderColor: error ? theme.colors.danger : theme.colors.borderStrong,
          paddingHorizontal: theme.space[4] - (error ? 1 : 0),
          backgroundColor: disabled ? theme.colors.surfaceSunken : theme.colors.surface,
        },
      ]}
    >
      <Text variant="body" color={current ? (disabled ? 'disabled' : 'primary') : 'tertiary'} style={styles.flex}>
        {current ? current.label : placeholder}
      </Text>
      <Icon name="expand" size={16} weight="semibold" color="textSecondary" />
    </View>
  );

  return (
    <View>
      <FieldLabel label={label} optional={optional} />
      {disabled ? (
        <View testID={testID}>{field}</View>
      ) : (
        <MenuView
          title={label}
          testID={testID}
          actions={options.map((o) => ({ id: o.value, title: o.label, state: o.value === value ? 'on' : 'off' }))}
          onPressAction={({ nativeEvent }) => {
            const next = options.find((o) => o.value === nativeEvent.event);
            if (!next) return;
            selectionFeedback();
            onChange(next.value);
          }}
        >
          {field}
        </MenuView>
      )}
      <FieldMessage helper={helper} error={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
});
