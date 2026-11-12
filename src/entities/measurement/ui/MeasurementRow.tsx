import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { formatShortDate } from '@/shared/lib';
import { Icon, MetricValue, RangeBar, StateChip, Text, metricAccessibilityLabel, useStackedLayout, useTheme } from '@/shared/ui';
import { formatMeasurementValue } from '../domain/format-value';
import { computeFlag } from '../domain/reference';
import { spokenUnit } from '../domain/spoken-unit';
import type { Measurement } from '../domain/types';
import { referenceRangeText } from './format';

export interface MeasurementRowProps {
  measurement: Measurement;
  /** Origem pronta (S5): "Do documento {título}, {data}" ou "Registrado por você". */
  origin: string;
  /** Padrão: o rótulo do resultado. Ex.: "Hemoglobina glicada · Carlos". */
  label?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Linha de exame contra a régua do laudo: rótulo, valor tabular, estado R1 em texto (A2), `RangeBar`,
 * "Faixa do laudo: …", data e origem. Um elemento só para o leitor de tela. Use dentro de `ListSection`.
 */
export function MeasurementRow({ measurement: m, origin, label, onPress, style, testID }: MeasurementRowProps) {
  const theme = useTheme();
  const stacked = useStackedLayout();
  const state = computeFlag(m.value, m.referenceLow, m.referenceHigh);
  const value = formatMeasurementValue(m);
  const unitSpoken = spokenUnit(m.unit, m.value);
  const range = referenceRangeText(m);
  const date = formatShortDate(m.takenOn);
  const title = label ?? m.label;
  const a11y = [title, metricAccessibilityLabel({ value, unit: m.unit, unitSpoken, state }), range ? `faixa do laudo ${range}` : null, date, origin]
    .filter(Boolean)
    .join(', ');

  const content = (
    <>
      <View style={[stacked ? styles.column : styles.top, { gap: theme.space[2] }]}>
        <Text variant="headline" style={stacked ? undefined : styles.shrink}>
          {title}
        </Text>
        <View style={[styles.row, { gap: theme.space[2] }]}>
          <MetricValue value={value} unit={m.unit} unitSpoken={unitSpoken} />
          {onPress && Platform.OS === 'ios' && !stacked ? <Icon name="forward" size={15} weight="semibold" color="textTertiary" /> : null}
        </View>
      </View>
      <View style={[styles.wrap, { gap: theme.space[3], marginTop: theme.space[2] }]}>
        <StateChip state={state} variant="long" />
        <RangeBar value={m.value} range={{ low: m.referenceLow ?? undefined, high: m.referenceHigh ?? undefined, text: m.referenceText ?? undefined }} state={state} width={stacked ? 'fill' : 112} />
      </View>
      <Text variant="footnote" color="secondary" style={{ marginTop: theme.space[2] }}>
        {range ? `Faixa do laudo: ${range} · ${date}` : date}
      </Text>
      <Text variant="footnote" color="secondary">
        {origin}
      </Text>
    </>
  );

  // v4: linha da folha, alinhada à coluna de texto (a `ListSection` desenha o fio embaixo).
  const box = { paddingVertical: 14, minHeight: theme.layout.rowMinHeight };
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={a11y} testID={testID} style={[box, style]}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      android_ripple={{ color: theme.colors.border }}
      testID={testID}
      style={({ pressed }) => [box, pressed && Platform.OS !== 'android' && { backgroundColor: theme.colors.surfaceSunken }, style]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  column: { alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  shrink: { flexShrink: 1 },
});
