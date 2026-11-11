import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { FocusRing, useFocusState } from '../lib/focus';
import { Icon } from './Icon';
import { Text } from './Text';
import { useInListSection } from './ListSection';

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

/**
 * Linha de lista. Dentro de `ListSection` vira célula de lista agrupada (recuo 16, separador fino);
 * fora dela, linha de tela cheia com margem 20 (v1).
 */
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
  const inSection = useInListSection();
  const label = accessibilityLabel ?? [title, subtitle, meta].filter(Boolean).join(', ');
  const showChevron = chevron && !trailing && Platform.OS === 'ios';
  // Com texto grande (Dynamic Type de acessibilidade), o meta desce para baixo do título em vez de disputar a largura.
  const stacked = useWindowDimensions().fontScale >= 1.35;
  const metaText = meta ? (
    <Text variant="subheadline" color="secondary" tabular style={stacked ? { marginTop: 2 } : styles.meta}>
      {meta}
    </Text>
  ) : null;

  const content = (
    <>
      {leading ? <View>{leading}</View> : null}
      <View style={styles.texts}>
        <Text variant="body" color={disabled ? 'disabled' : destructive ? 'danger' : 'primary'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="subheadline" color="secondary" style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
        {stacked ? metaText : null}
      </View>
      {stacked ? null : metaText}
      {trailing}
      {showChevron ? <Icon name="forward" size={15} weight="semibold" color="textTertiary" /> : null}
    </>
  );

  const rowStyle = [
    styles.row,
    {
      minHeight: subtitle ? 64 : 52,
      paddingHorizontal: inSection ? theme.space[4] : theme.layout.screenGutter,
      paddingVertical: theme.space[3],
      gap: theme.space[3],
    },
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
