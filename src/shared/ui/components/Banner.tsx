import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ColorTokens } from '../tokens';
import { useTheme } from '../theme';
import { Button } from './Button';
import { GlassSurface } from './GlassSurface';
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
  /**
   * 'inline' (padrão): bloco suave no fluxo da tela.
   * 'floating': pílula de vidro que flutua sobre o conteúdo (offline, sincronizando). Só `message` curta;
   * `title` é ignorado. Posicione no pai (ex.: absoluta acima da barra de abas).
   */
  appearance?: 'inline' | 'floating';
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
export function Banner({ message, title, tone = 'info', icon, action, appearance = 'inline', onDismiss, style, testID }: BannerProps) {
  const theme = useTheme();
  const t = TONES[tone];
  if (appearance === 'floating') {
    const fg = tone === 'info' ? 'primary' : tone === 'warning' ? 'warning' : tone === 'success' ? 'success' : 'danger';
    return (
      <View
        accessibilityRole={tone === 'danger' ? 'alert' : 'summary'}
        accessibilityLiveRegion="polite"
        testID={testID}
        style={[styles.floatWrap, style]}
      >
        <GlassSurface shape="capsule" style={[styles.pill, { paddingLeft: theme.space[4], paddingRight: action || onDismiss ? theme.space[1] : theme.space[4], gap: theme.space[2] }]}>
          <Icon name={icon ?? t.icon} size={18} weight="semibold" color={fg} />
          <Text variant="subheadline" numberOfLines={2} style={styles.shrink}>
            {message}
          </Text>
          {action ? <Button label={action.label} variant="plain" size="sm" onPress={action.onPress} /> : null}
          {onDismiss ? <IconButton icon="close" iconSize={18} color="textSecondary" accessibilityLabel="Fechar aviso" onPress={onDismiss} /> : null}
        </GlassSurface>
      </View>
    );
  }
  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : 'summary'}
      accessibilityLiveRegion={tone === 'danger' || tone === 'warning' ? 'polite' : 'none'}
      testID={testID}
      style={[styles.box, { backgroundColor: theme.colors[t.bg], borderRadius: theme.radii.card, borderCurve: 'continuous', padding: theme.space[4], gap: theme.space[3] }, style]}
    >
      <Icon name={icon ?? t.icon} size={22} color={t.fg} />
      <View style={styles.flex}>
        {title ? (
          <Text variant="headline" color={t.fg}>
            {title}
          </Text>
        ) : null}
        <Text variant="subheadline" color={t.fg} style={title ? { marginTop: 2 } : undefined}>
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
  floatWrap: { alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', minHeight: 44, maxWidth: 520 },
  shrink: { flexShrink: 1 },
});
