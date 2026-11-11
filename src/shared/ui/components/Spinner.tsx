import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { resolveColor, type ColorRole } from './Icon';
import { Text } from './Text';

export interface SpinnerProps {
  size?: 'small' | 'large';
  color?: ColorRole | (string & {});
  /** Texto visível abaixo (ex.: "Carregando documentos"). Também vira o rótulo acessível. */
  label?: string;
  /** Centraliza ocupando o espaço disponível. */
  fill?: boolean;
  testID?: string;
}

export function Spinner({ size = 'large', color = 'primary', label, fill, testID }: SpinnerProps) {
  const theme = useTheme();
  return (
    <View
      style={[styles.base, fill && styles.fill]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Carregando'}
      accessibilityState={{ busy: true }}
      testID={testID}
    >
      <ActivityIndicator size={size} color={resolveColor(theme.colors, color)} />
      {label ? (
        <Text variant="subhead" color="secondary" align="center" style={{ marginTop: theme.space[3] }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1, padding: 24 },
});
