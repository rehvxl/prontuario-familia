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
 * Android/web: botões segmentados do Material 3 (cápsula contornada, segmento escolhido em
 * secondary container com marca). iOS: SegmentedControl.ios.tsx usa o Picker segmentado do sistema.
 */
export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel, disabled = false, testID }: SegmentedControlProps<T>) {
  const theme = useTheme();
  const outline = disabled ? theme.colors.border : theme.colors.borderStrong;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[styles.track, { borderColor: outline, borderRadius: 999 }]}
    >
      {options.map((opt, i) => {
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
                backgroundColor: selected ? theme.colors.primarySoft : 'transparent',
                borderLeftWidth: i === 0 ? 0 : 1,
                borderLeftColor: outline,
              },
            ]}
          >
            {selected ? <Icon name="check" size={18} color={disabled ? 'textDisabled' : 'onPrimarySoft'} /> : null}
            <Text
              variant={selected ? 'bodyStrong' : 'body'}
              color={disabled ? 'disabled' : selected ? 'onPrimarySoft' : 'primary'}
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
  track: { flexDirection: 'row', borderWidth: 1, overflow: 'hidden' },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  shrink: { flexShrink: 1 },
});
