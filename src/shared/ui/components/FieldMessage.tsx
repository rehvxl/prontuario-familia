import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

export interface FieldLabelProps {
  label: string;
  optional?: boolean;
  nativeID?: string;
}

/** Rótulo sempre visível acima do campo (nunca só placeholder). */
export function FieldLabel({ label, optional, nativeID }: FieldLabelProps) {
  const theme = useTheme();
  return (
    <Text variant="headline" nativeID={nativeID} style={{ marginBottom: theme.space[2] }}>
      {label}
      {optional ? (
        <Text variant="subhead" color="secondary">
          {'  (opcional)'}
        </Text>
      ) : null}
    </Text>
  );
}

/** Mensagem de ajuda ou de erro abaixo do campo. Erro sempre com ícone (não depende só da cor). */
export function FieldMessage({ helper, error }: { helper?: string | undefined; error?: string | null | undefined }) {
  const theme = useTheme();
  if (error) {
    return (
      <View style={[styles.row, { marginTop: theme.space[2], gap: theme.space[1] }]} accessibilityLiveRegion="polite">
        <Icon name="alert-circle" size={18} color="danger" />
        <Text variant="subhead" color="danger" style={styles.flex}>
          {error}
        </Text>
      </View>
    );
  }
  if (!helper) return null;
  return (
    <Text variant="subhead" color="secondary" style={{ marginTop: theme.space[2] }}>
      {helper}
    </Text>
  );
}

/** Dica acessível do campo: o erro (quando há) tem prioridade sobre a ajuda. */
export function fieldAccessibilityHint(helper?: string, error?: string | null): string | undefined {
  if (error) return `Erro: ${error}`;
  return helper;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
});
