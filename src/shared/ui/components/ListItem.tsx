import { useState, type ReactNode } from 'react';
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
  /** Texto curto à direita (ex.: data), em números tabulares. */
  meta?: string;
  /** Avatar, ícone ou marcador à esquerda. Para ícone, use `IconTile` (36 pt, raio 10). */
  leading?: ReactNode;
  /**
   * v3: valor à direita dentro da linha (ex.: `MetricValue`). Faz parte do elemento de acessibilidade
   * da linha: inclua o que ele diz em `accessibilityLabel`.
   */
  value?: ReactNode;
  /** v3: 'headline' para títulos de linha em destaque (ex.: "Para acompanhar"). Padrão 'body'. */
  titleVariant?: 'body' | 'headline';
  /**
   * Conteúdo à direita (badge, switch, botão de menu). Substitui o chevron. Fica fora do elemento de
   * acessibilidade da linha: o VoiceOver/TalkBack lê a linha e depois chega ao controle da direita.
   */
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
 * Linha de lista. Dentro de `ListSection` (v4) vira linha da folha: alinhada à coluna de texto, sem recuo
 * próprio, fio fino embaixo; fora dela, linha de tela cheia com margem 20 (v1).
 */
export function ListItem({
  title,
  subtitle,
  meta,
  leading,
  value,
  titleVariant = 'body',
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

  const textColumn = (
    <>
      {leading ? <View>{leading}</View> : null}
      <View style={styles.texts}>
        <Text variant={titleVariant} color={disabled ? 'disabled' : destructive ? 'danger' : 'primary'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="subheadline" color="secondary" style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
        {stacked ? metaText : null}
        {stacked && value ? <View style={{ marginTop: theme.space[1] }}>{value}</View> : null}
      </View>
      {stacked ? null : metaText}
      {!stacked && value ? <View style={styles.value}>{value}</View> : null}
    </>
  );

  const padH = inSection ? 0 : theme.layout.screenGutter;
  const minHeight = subtitle ? 64 : theme.layout.rowMinHeight;
  const gap = inSection ? theme.space[2] : theme.space[3];
  const rowStyle = [styles.row, { minHeight, paddingHorizontal: padH, paddingVertical: theme.space[3], gap }];
  const pressedBg = { backgroundColor: theme.colors.surfaceSunken };

  // Com `trailing`, a linha vira dois elementos irmãos: a área principal (rótulo, toque) e o controle
  // da direita. Agrupar tudo num só elemento acessível esconde o controle do leitor de tela.
  if (trailing) {
    return (
      <TrailingRow
        style={[styles.row, { minHeight }, style]}
        mainStyle={[styles.row, styles.main, { paddingLeft: padH, paddingRight: gap, paddingVertical: theme.space[3], gap }]}
        trailingStyle={{ paddingRight: padH }}
        pressedBg={pressedBg}
        onPress={onPress}
        disabled={disabled}
        label={label}
        hint={accessibilityHint}
        rippleColor={theme.colors.border}
        testID={testID}
        trailing={trailing}
      >
        {textColumn}
      </TrailingRow>
    );
  }

  if (!onPress) {
    return (
      <View style={[rowStyle, style]} accessible accessibilityLabel={label} testID={testID}>
        {textColumn}
        {showChevron ? <Icon name="forward" size={15} weight="semibold" color="textTertiary" /> : null}
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
      style={({ pressed }) => [rowStyle, pressed && Platform.OS !== 'android' && pressedBg, style]}
    >
      {textColumn}
      {showChevron ? <Icon name="forward" size={15} weight="semibold" color="textTertiary" /> : null}
      <FocusRing visible={focus.focused} radius={0} />
    </Pressable>
  );
}

interface TrailingRowProps {
  children: ReactNode;
  trailing: ReactNode;
  style: StyleProp<ViewStyle>;
  mainStyle: StyleProp<ViewStyle>;
  trailingStyle: ViewStyle;
  pressedBg: ViewStyle;
  onPress?: () => void;
  disabled: boolean;
  label: string;
  hint?: string;
  rippleColor: string;
  testID?: string;
}

function TrailingRow({ children, trailing, style, mainStyle, trailingStyle, pressedBg, onPress, disabled, label, hint, rippleColor, testID }: TrailingRowProps) {
  const focus = useFocusState();
  // O destaque de toque cobre a linha inteira, inclusive atrás do controle da direita.
  const [pressed, setPressed] = useState(false);
  const main = onPress ? (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      android_ripple={{ color: rippleColor }}
      testID={testID}
      style={mainStyle}
    >
      {children}
      <FocusRing visible={focus.focused} radius={0} />
    </Pressable>
  ) : (
    <View style={mainStyle} accessible accessibilityLabel={label} testID={testID}>
      {children}
    </View>
  );
  return (
    <View style={[style, pressed && Platform.OS !== 'android' && pressedBg]}>
      {main}
      <View style={[styles.trailing, trailingStyle]}>{trailing}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  texts: { flex: 1 },
  meta: { flexShrink: 0, maxWidth: '40%' },
  value: { flexShrink: 0, maxWidth: '50%', alignItems: 'flex-end' },
  main: { flex: 1, alignSelf: 'stretch' },
  trailing: { justifyContent: 'center' },
});
