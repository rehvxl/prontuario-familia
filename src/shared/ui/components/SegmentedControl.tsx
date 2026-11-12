import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { selectionFeedback } from '../lib/haptics';
import { Icon } from './Icon';
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

/**
 * Android/web (v3): trilho `surfaceSunken`, segmento escolhido em `surface` com sombra de segmento e
 * marca (não depende só da cor). iOS: SegmentedControl.ios.tsx usa o Picker segmentado do sistema.
 */
export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel, disabled = false, testID }: SegmentedControlProps<T>) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[styles.track, { backgroundColor: theme.colors.surfaceSunken, borderRadius: theme.radii.control, padding: 2, gap: 2 }]}
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
            android_ripple={{ color: theme.colors.border }}
            style={[
              styles.segment,
              {
                minHeight: theme.minTouchTarget,
                paddingHorizontal: theme.space[3],
                borderRadius: theme.radii.control,
                backgroundColor: selected ? theme.colors.surface : 'transparent',
              },
              selected && styles.selectedShadow,
              selected && { borderColor: theme.colors.border },
            ]}
          >
            {selected ? <Icon name="check" size={18} color={disabled ? 'textDisabled' : 'primary'} /> : null}
            <Text
              variant={selected ? 'bodyStrong' : 'body'}
              color={disabled ? 'disabled' : 'primary'}
              align="center"
              numberOfLines={2}
              style={styles.shrink}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', overflow: 'hidden' },
  // Sombra de segmento do DESIGN.md (0 1 3 rgba(20,28,24,.12) + fio 0,5 pt).
  selectedShadow: { boxShadow: '0 1px 3px rgba(20, 25, 70, 0.12)', borderWidth: StyleSheet.hairlineWidth },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  shrink: { flexShrink: 1 },
});
