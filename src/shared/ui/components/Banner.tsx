import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ColorTokens } from '../tokens';
import { useTheme } from '../theme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { IconButton } from './IconButton';
import { Text } from './Text';

export type BannerTone = 'info' | 'warning' | 'success' | 'danger';

export interface BannerProps {
  message: string;
  title?: string;
  tone?: BannerTone;
  icon?: IconName;
  action?: { label: string; onPress: () => void };
  /** Mostra o botão fechar. */
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const TONES: Record<BannerTone, { bg: keyof ColorTokens; fg: keyof ColorTokens; icon: IconName }> = {
  info: { bg: 'infoSoft', fg: 'onInfoSoft', icon: 'information-circle' },
  warning: { bg: 'warningSoft', fg: 'onWarningSoft', icon: 'warning' },
  success: { bg: 'successSoft', fg: 'onSuccessSoft', icon: 'checkmark-circle' },
  danger: { bg: 'dangerSoft', fg: 'onDangerSoft', icon: 'alert-circle' },
};

/** Aviso persistente no fluxo da tela (ex.: "Modo demonstração"). Não é toast nem modal. */
export function Banner({ message, title, tone = 'info', icon, action, onDismiss, style, testID }: BannerProps) {
  const theme = useTheme();
  const t = TONES[tone];
  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : 'summary'}
      accessibilityLiveRegion={tone === 'danger' || tone === 'warning' ? 'polite' : 'none'}
      testID={testID}
      style={[styles.box, { backgroundColor: theme.colors[t.bg], borderRadius: theme.radii.md, padding: theme.space[4], gap: theme.space[3] }, style]}
    >
      <Icon name={icon ?? t.icon} size={22} color={t.fg} />
      <View style={styles.flex}>
        {title ? (
          <Text variant="headline" color={t.fg}>
            {title}
          </Text>
        ) : null}
        <Text variant="subhead" color={t.fg} style={title ? { marginTop: 2 } : undefined}>
          {message}
        </Text>
        {action ? (
          <View style={{ marginTop: theme.space[2], marginLeft: -theme.space[4] }}>
            <Button label={action.label} variant="ghost" size="sm" onPress={action.onPress} />
          </View>
        ) : null}
      </View>
      {onDismiss ? <IconButton icon="close" color={t.fg} accessibilityLabel="Fechar aviso" onPress={onDismiss} style={styles.close} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
  close: { marginTop: -10, marginRight: -10 },
});
