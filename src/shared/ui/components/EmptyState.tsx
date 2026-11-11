import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface EmptyStateProps {
  title: string;
  /** Explique o que aparece aqui e o próximo passo, sem culpa ("Ainda não há documentos da Ana."). */
  message?: string;
  icon?: IconName;
  action?: { label: string; onPress: () => void; icon?: IconName };
  secondaryAction?: { label: string; onPress: () => void };
  /** Tom de erro (falha ao carregar) — usa ícone de alerta por padrão. */
  tone?: 'neutral' | 'error';
  testID?: string;
}

export function EmptyState({ title, message, icon, action, secondaryAction, tone = 'neutral', testID }: EmptyStateProps) {
  const theme = useTheme();
  const isError = tone === 'error';
  return (
    <View style={[styles.box, { padding: theme.space[8], gap: theme.space[3] }]} testID={testID}>
      <View
        style={[
          styles.icon,
          { backgroundColor: isError ? theme.colors.dangerSoft : theme.colors.primarySoft, marginBottom: theme.space[2] },
        ]}
      >
        <Icon name={icon ?? (isError ? 'offline' : 'folder')} size={34} color={isError ? 'onDangerSoft' : 'onPrimarySoft'} />
      </View>
      <Text variant="title3" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="body" color="secondary" align="center">
          {message}
        </Text>
      ) : null}
      {action || secondaryAction ? (
        <View style={[styles.actions, { gap: theme.space[2], marginTop: theme.space[3] }]}>
          {action ? <Button label={action.label} icon={action.icon} onPress={action.onPress} fullWidth /> : null}
          {secondaryAction ? <Button label={secondaryAction.label} variant="ghost" onPress={secondaryAction.onPress} fullWidth /> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center', maxWidth: 400, width: '100%' },
  icon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  actions: { alignSelf: 'stretch' },
});
