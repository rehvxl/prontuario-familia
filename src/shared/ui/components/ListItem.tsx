import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { FocusRing, useFocusState } from '../lib/focus';
import { Icon } from './Icon';
import { Text } from './Text';

export interface ListItemProps {
  title: string;
  /** Segunda linha (ex.: "Laboratório Fleury · Dr. Paulo"). */
  subtitle?: string;
  /** Texto curto à direita (ex.: data). */
  meta?: string;
  /** Avatar, ícone ou marcador à esquerda. */
  leading?: ReactNode;
  /** Conteúdo à direita (badge, switch). Substitui o chevron. */
  trailing?: ReactNode;
  onPress?: () => void;
  /** Mostra a seta de navegação. Segue a plataforma: aparece no iOS, omitida no Android (Material). */
  chevron?: boolean;
  /** Título em vermelho (ex.: "Excluir conta"). */
  destructive?: boolean;
  /** Padrão: título, subtítulo e meta juntos. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ListItem({
  title,
  subtitle,
  meta,
  leading,
  trailing,
  onPress,
  chevron = !!onPress,
  destructive,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  style,
  testID,
}: ListItemProps) {
  const theme = useTheme();
  const focus = useFocusState();
  const label = accessibilityLabel ?? [title, subtitle, meta].filter(Boolean).join(', ');
  const showChevron = chevron && !trailing && Platform.OS === 'ios';

  const content = (
    <>
      {leading ? <View>{leading}</View> : null}
      <View style={styles.texts}>
        <Text variant="body" color={disabled ? 'disabled' : destructive ? 'danger' : 'primary'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="subhead" color="secondary" style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {meta ? (
        <Text variant="subhead" color="secondary" tabular style={styles.meta}>
          {meta}
        </Text>
      ) : null}
      {trailing}
      {showChevron ? <Icon name="chevron-forward" size={20} color="textTertiary" /> : null}
    </>
  );

  const rowStyle = [
    styles.row,
    { minHeight: subtitle ? 64 : 52, paddingHorizontal: theme.layout.screenGutter, paddingVertical: theme.space[3], gap: theme.space[3] },
  ];

  if (!onPress) {
    return (
      <View style={[rowStyle, style]} accessible accessibilityLabel={label} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      android_ripple={{ color: theme.colors.border }}
      testID={testID}
      style={({ pressed }) => [rowStyle, pressed && Platform.OS !== 'android' && { backgroundColor: theme.colors.surfaceSunken }, style]}
    >
      {content}
      <FocusRing visible={focus.focused} radius={0} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  texts: { flex: 1 },
  meta: { flexShrink: 0, maxWidth: '40%' },
});
