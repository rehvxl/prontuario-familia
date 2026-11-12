import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { REFERENCE_STATE_APPEARANCE, type ReferenceState } from './clinical';
import { Icon } from './Icon';
import { Text } from './Text';

export interface StateChipProps {
  state: ReferenceState;
  /** 'short' ("Acima da faixa") ou 'long' ("Acima da faixa do laudo", texto da A2). Padrão 'short'. */
  variant?: 'short' | 'long';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Cápsula do estado clínico: ícone + texto sobre o `*Soft`. O leitor de tela ouve sempre o texto longo. */
export function StateChip({ state, variant = 'short', style, testID }: StateChipProps) {
  const theme = useTheme();
  const a = REFERENCE_STATE_APPEARANCE[state];
  return (
    <View
      accessible
      accessibilityLabel={a.long}
      testID={testID}
      style={[styles.chip, { backgroundColor: theme.colors[a.soft], borderRadius: theme.radii.control, gap: theme.space[1] }, style]}
    >
      <Icon name={a.icon} size={15} weight="semibold" color={a.onSoft} scaleWithText />
      <Text variant="caption" color={a.onSoft} style={styles.label}>
        {variant === 'long' ? a.long : a.short}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 3, paddingLeft: 6, paddingRight: 9 },
  label: { fontWeight: '600', flexShrink: 1 },
});
