import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { Text } from './Text';

export interface ProgressStepsProps {
  /** 0 a 1. */
  progress: number;
  /** Visível e lido ("1 de 2"). */
  label: string;
  /** Anuncia cada mudança (`polite`). Padrão true. */
  liveRegion?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Barra de progresso determinada: trilho de 4 pt `rangeTrack`, preenchimento `primary`, rótulo tabular. */
export function ProgressSteps({ progress, label, liveRegion = true, style, testID }: ProgressStepsProps) {
  const theme = useTheme();
  const p = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}
      accessibilityLiveRegion={liveRegion ? 'polite' : 'none'}
      testID={testID}
      style={[{ gap: theme.space[2] }, style]}
    >
      <View style={{ height: 4, borderRadius: theme.radii.bar, backgroundColor: theme.colors.rangeTrack, overflow: 'hidden' }}>
        <View style={{ width: `${p * 100}%`, height: 4, borderRadius: theme.radii.bar, backgroundColor: theme.colors.primary }} />
      </View>
      <Text variant="footnote" color="secondary" tabular>
        {label}
      </Text>
    </View>
  );
}
