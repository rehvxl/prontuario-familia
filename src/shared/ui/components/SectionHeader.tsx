import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { useStackedLayout } from '../lib/a11y';
import { Text } from './Text';

export interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress(): void; accessibilityHint?: string };
  /** 'month' é o mês da linha do tempo: mesmo estilo, menos respiro acima. Padrão 'section'. */
  level?: 'section' | 'month';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Cabeçalho de seção (title3: 20 pt Bold, Archivo), anunciado como cabeçalho, com ação opcional na tinta
 * da divisória e um fio fino ao lado do título até a ação (o índice do manual). Respiro 28 acima e 10 abaixo;
 * a margem lateral é a do pai (Screen/Leaf). Em AX3+ a ação desce e o fio sai.
 */
export function SectionHeader({ title, action, level = 'section', style, testID }: SectionHeaderProps) {
  const theme = useTheme();
  const stacked = useStackedLayout();
  const slop = Math.max(0, (theme.minTouchTarget - theme.typography.subheadline.lineHeight) / 2);
  return (
    <View
      testID={testID}
      style={[
        stacked ? styles.stacked : styles.row,
        {
          marginTop: level === 'month' ? theme.space[6] : theme.layout.sectionHeaderTop,
          marginBottom: theme.layout.sectionHeaderBottom,
          gap: theme.space[2],
        },
        style,
      ]}
    >
      <Text variant="title3" style={stacked ? undefined : styles.title}>
        {title}
      </Text>
      {stacked ? null : <View testID={testID ? `${testID}-rule` : undefined} style={[styles.rule, { backgroundColor: theme.colors.border }]} />}
      {action ? (
        <Pressable
          onPress={action.onPress}
          hitSlop={{ top: slop, bottom: slop, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityHint={action.accessibilityHint}
          style={({ pressed }) => pressed && { opacity: 0.6 }}
        >
          <Text variant="subheadline" color="link" style={styles.action}>
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline' },
  // Decorativo: sem papel, não entra no leitor de tela.
  rule: { flex: 1, alignSelf: 'center', height: StyleSheet.hairlineWidth, minWidth: 16 },
  stacked: { alignItems: 'flex-start' },
  title: { flexShrink: 1 },
  action: { fontWeight: '600' },
});
