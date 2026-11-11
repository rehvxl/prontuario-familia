import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { selectionFeedback } from '../lib/haptics';
import { Text } from './Text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  /** 2 a 4 opções curtas. Para mais opções, use Select ou ChipGroup. */
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Nome do grupo para leitores de tela ("Sexo", "Ordenar por"). */
  accessibilityLabel: string;
  disabled?: boolean;
  testID?: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel, disabled = false, testID }: SegmentedControlProps<T>) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[styles.track, { backgroundColor: theme.colors.surfaceSunken, borderRadius: theme.radii.md, padding: 3, gap: 3 }]}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            disabled={disabled}
            onPress={() => {
              if (selected) return;
              selectionFeedback();
              onChange(opt.value);
            }}
            accessibilityRole="radio"
            accessibilityLabel={opt.label}
            accessibilityState={{ checked: selected, selected, disabled }}
            style={({ pressed }) => [
              styles.segment,
              {
                minHeight: theme.minTouchTarget - 6,
                borderRadius: theme.radii.sm + 1,
                paddingHorizontal: theme.space[2],
                backgroundColor: selected ? theme.colors.surfaceRaised : 'transparent',
              },
              selected && theme.elevation(1),
              pressed && !selected && Platform.OS !== 'android' && { opacity: 0.6 },
            ]}
          >
            <Text variant={selected ? 'bodyStrong' : 'body'} color={disabled ? 'disabled' : selected ? 'primary' : 'secondary'} align="center" numberOfLines={2}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row' },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
});
