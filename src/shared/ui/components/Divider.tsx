import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';

export interface DividerProps {
  /** Recuo à esquerda em pt (ex.: alinhar ao texto de um ListItem com avatar = 72). */
  inset?: number;
  /** Espaço vertical acima e abaixo. */
  spacing?: number;
}

export function Divider({ inset = 0, spacing = 0 }: DividerProps) {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border, marginLeft: inset, marginVertical: spacing }}
    />
  );
}
