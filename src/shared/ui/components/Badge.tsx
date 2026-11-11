import { StyleSheet, View } from 'react-native';
import type { CategoricalIndex, ColorTokens } from '../tokens';
import { useTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  /** Usa a paleta categórica em vez de um tom semântico (ex.: tipo de registro). */
  colorIndex?: CategoricalIndex;
  icon?: IconName;
  testID?: string;
}

const TONES: Record<BadgeTone, [keyof ColorTokens, keyof ColorTokens]> = {
  neutral: ['surfaceSunken', 'textSecondary'],
  primary: ['primarySoft', 'onPrimarySoft'],
  success: ['successSoft', 'onSuccessSoft'],
  warning: ['warningSoft', 'onWarningSoft'],
  danger: ['dangerSoft', 'onDangerSoft'],
  info: ['infoSoft', 'onInfoSoft'],
};

export function Badge({ label, tone = 'neutral', colorIndex, icon, testID }: BadgeProps) {
  const theme = useTheme();
  const cat = colorIndex !== undefined ? theme.categorical[colorIndex] : undefined;
  const [bgKey, fgKey] = TONES[tone];
  const bg = cat?.soft ?? theme.colors[bgKey];
  const fg = cat?.main ?? theme.colors[fgKey];
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: theme.radii.full, paddingHorizontal: theme.space[2] + 2, gap: theme.space[1] }]} testID={testID}>
      {icon ? <Icon name={icon} size={14} color={fg} /> : null}
      <Text variant="caption" style={{ color: fg, fontWeight: '600' }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 3 },
});
