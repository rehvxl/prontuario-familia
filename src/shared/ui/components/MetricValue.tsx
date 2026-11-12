import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { spokenState, type ReferenceState } from './clinical';
import { StateChip } from './StateChip';
import { Text } from './Text';

export interface MetricValueProps {
  /** Já formatado em pt-BR ("7,4"). O formato é do domínio. */
  value: string;
  /** Segundo valor (diastólica): mostra "142/88". */
  value2?: string;
  unit: string;
  /** Unidade por extenso para o leitor de tela ("miligramas por decilitro"). Sem ela, lê `unit`. */
  unitSpoken?: string;
  state?: ReferenceState;
  /** Padrão 'row'. */
  size?: 'hero' | 'row' | 'compact';
  /** Mostra o `StateChip`. Padrão true em 'hero', false nos outros. */
  showStateLabel?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const VALUE_VARIANT = { hero: 'metricHero', row: 'metric', compact: 'headline' } as const;
const UNIT_VARIANT = { hero: 'metricUnit', row: 'metricUnit', compact: 'footnote' } as const;

/** Rótulo único do leitor de tela: "7,4 por cento, acima da faixa do laudo". */
export function metricAccessibilityLabel({ value, value2, unit, unitSpoken, state }: Pick<MetricValueProps, 'value' | 'value2' | 'unit' | 'unitSpoken' | 'state'>): string {
  const number = value2 ? `${value} por ${value2}` : value;
  const spoken = unitSpoken ?? unit;
  const base = spoken ? `${number} ${spoken}` : number;
  return state ? `${base}, ${spokenState(state)}` : base;
}

/**
 * Valor + unidade (+ estado). Número tabular; unidade em `metricUnit` `textSecondary` a 4 pt; nunca
 * trunca. Um elemento só para o leitor de tela.
 */
export function MetricValue({ value, value2, unit, unitSpoken, state, size = 'row', showStateLabel, style, testID }: MetricValueProps) {
  const theme = useTheme();
  const showChip = state !== undefined && (showStateLabel ?? size === 'hero');
  return (
    <View
      accessible
      accessibilityLabel={metricAccessibilityLabel({ value, value2, unit, unitSpoken, state })}
      testID={testID}
      style={[size === 'hero' ? { gap: theme.space[2] } : [styles.inline, { gap: theme.space[2] }], style]}
    >
      <View style={[styles.number, { gap: theme.space[1] }]}>
        <Text variant={VALUE_VARIANT[size]} tabular>
          {value2 ? `${value}/${value2}` : value}
        </Text>
        {unit ? (
          <Text variant={UNIT_VARIANT[size]} color="secondary">
            {unit}
          </Text>
        ) : null}
      </View>
      {showChip ? <StateChip state={state} variant={size === 'hero' ? 'long' : 'short'} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  number: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
});
