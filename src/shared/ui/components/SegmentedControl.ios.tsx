import { SegmentedControl as NativeSegmented } from '@expo/ui/community/segmented-control';
import { View } from 'react-native';
import { useTheme } from '../theme';
import type { SegmentedControlProps } from './SegmentedControl';

export type { SegmentOption, SegmentedControlProps } from './SegmentedControl';

/**
 * iOS: `Picker` SwiftUI com estilo segmentado (o controle do sistema, com Dynamic Type e
 * VoiceOver nativos; vidro no iOS 26). Mesma API do v1.
 */
export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel, disabled = false, testID }: SegmentedControlProps<T>) {
  const theme = useTheme();
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <View style={{ minHeight: 36 }}>
      <NativeSegmented
        values={options.map((o) => o.label)}
        selectedIndex={index}
        enabled={!disabled}
        appearance={theme.scheme}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        onChange={(event) => {
          const next = options[event.nativeEvent.selectedSegmentIndex];
          if (next && next.value !== value) onChange(next.value);
        }}
      />
    </View>
  );
}
