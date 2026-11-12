import { StyleSheet, View } from 'react-native';
import type { CategoricalIndex, ColorTokens } from '../tokens';
import { useTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/** v3: tons clínicos para status (prefira `StateChip` para estado de faixa do laudo). */
export type BadgeTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'clinicalIn'
  | 'clinicalHigh'
  | 'clinicalLow'
  | 'clinicalNone';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  /** Usa a paleta categórica em vez de um tom semântico (0..6 pessoa, 7 neutro). */
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
  clinicalIn: ['clinicalInSoft', 'onClinicalInSoft'],
  clinicalHigh: ['clinicalHighSoft', 'onClinicalHighSoft'],
  clinicalLow: ['clinicalLowSoft', 'onClinicalLowSoft'],
  clinicalNone: ['clinicalNoneSoft', 'onClinicalNoneSoft'],
};

export function Badge({ label, tone = 'neutral', colorIndex, icon, testID }: BadgeProps) {
  const theme = useTheme();
  const cat = colorIndex !== undefined ? theme.categorical[colorIndex] : undefined;
  const [bgKey, fgKey] = TONES[tone];
  const bg = cat?.soft ?? theme.colors[bgKey];
  const fg = cat?.main ?? theme.colors[fgKey];
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: theme.radii.full, paddingHorizontal: 9, gap: theme.space[1] }]} testID={testID}>
      {icon ? <Icon name={icon} size={15} color={fg} /> : null}
      <Text variant="caption" style={{ color: fg, fontWeight: '600', flexShrink: 1 }}>
        {label}
      </Text>
    </View>
  );
}

export interface DemoBadgeProps {
  /** Padrão "Modo demonstração". */
  label?: string;
  testID?: string;
}

/**
 * Aviso de modo demonstração no fluxo da tela: cápsula `caption` no `soft` da divisória, logo abaixo do
 * título (DESIGN_SYSTEM §7.1). Não flutua, então não cobre a lista nem rouba toques.
 */
export function DemoBadge({ label = 'Modo demonstração', testID = 'demo-badge' }: DemoBadgeProps) {
  return <Badge label={label} tone="primary" icon="flask" testID={testID} />;
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 3 },
});
