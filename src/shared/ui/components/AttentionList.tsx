import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { HueName, HueTokens } from '../tokens';
import { useTheme } from '../theme';
import { FocusRing, useFocusState } from '../lib/focus';
import { useIconScale } from '../lib/a11y';
import { Icon, type IconName } from './Icon';
import { ListItem } from './ListItem';
import { ListSection } from './ListSection';
import { TabMark } from './TabMark';
import { Text } from './Text';

export type AttentionTone = 'high' | 'low' | 'care' | 'none';

export interface AttentionItemView {
  id: string;
  icon: IconName;
  tone: AttentionTone;
  /** "{Primeiro nome} · {o quê}" ("Carlos · Hemoglobina glicada"). */
  title: string;
  /** Estado em texto e números ("Acima da faixa do laudo · 7,4 % · 28 de out."). */
  detail: string;
  onPress(): void;
  /** Padrão: título e detalhe, com "·" lido como pausa. */
  accessibilityLabel?: string;
  /** v4: id da pessoa do item, para a marca de aba na cor dela. */
  personId?: string;
  /** v4: ou o matiz direto (vence `personId`). */
  hue?: HueName | HueTokens;
  /** v4: data curta à direita do título ("12 de out."), em números tabulares. */
  meta?: string;
}

export interface AttentionListProps {
  /** Já na ordem do domínio (F7.2). A lista nunca reordena. */
  items: readonly AttentionItemView[];
  /** Padrão 5. */
  max?: number;
  /** Total de itens para "Ver todos ({n})". Padrão `items.length`. */
  total?: number;
  onSeeAll?: () => void;
  /** Rodapé de 13 pt abaixo do grupo. */
  footer?: string;
  /** Texto do grupo vazio. Sem ele, a lista vazia não renderiza nada. */
  emptyText?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const spoken = (text: string) => text.replace(/\s·\s/g, ', ');

/**
 * "Para acompanhar" (v4): linhas da folha com a marca de aba da pessoa, "{Pessoa} · {o quê}" em peso médio,
 * a data à direita e o estado em ícone (tinta da divisória) + texto. `tone` não pinta nada: o estado é dito
 * pelo ícone e pelas palavras do domínio (nunca só cor, nunca vermelho).
 */
export function AttentionList({ items, max = 5, total, onSeeAll, footer, emptyText, style, testID }: AttentionListProps) {
  const theme = useTheme();
  const count = total ?? items.length;
  if (items.length === 0 && !emptyText) return null;
  const shown = items.slice(0, max);
  return (
    <View style={style} testID={testID}>
      <ListSection footer={footer}>
        {shown.length === 0 ? (
          <View style={{ paddingVertical: theme.space[3] + 1 }}>
            <Text variant="body" color="secondary">
              {emptyText}
            </Text>
          </View>
        ) : (
          shown.map((item) => <AttentionRow key={item.id} item={item} />)
        )}
        {onSeeAll && count > shown.length ? <ListItem title={`Ver todos (${count})`} onPress={onSeeAll} /> : null}
      </ListSection>
    </View>
  );
}

function AttentionRow({ item }: { item: AttentionItemView }) {
  const theme = useTheme();
  const iconScale = useIconScale();
  const focus = useFocusState();
  const label = item.accessibilityLabel ?? spoken([item.title, item.meta, item.detail].filter(Boolean).join(' · '));
  return (
    <Pressable
      onPress={item.onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: theme.colors.border }}
      testID={`attention-${item.id}`}
      style={({ pressed }) => [styles.row, { gap: theme.space[2], paddingVertical: theme.space[2] }, pressed && Platform.OS !== 'android' && { backgroundColor: theme.colors.surfaceSunken }]}
    >
      <TabMark id={item.personId} hue={item.hue} style={styles.mark} />
      <View style={styles.texts}>
        <View style={[styles.line, { gap: theme.space[2] }]}>
          <Text variant="headline" style={styles.title}>
            {item.title}
          </Text>
          {item.meta ? (
            <Text variant="subheadline" color="secondary" tabular>
              {item.meta}
            </Text>
          ) : null}
        </View>
        <View style={[styles.line, styles.detail, { gap: theme.space[1] + 2 }]}>
          <View style={{ marginTop: 2 * iconScale }}>
            <Icon name={item.icon} size={18} weight="semibold" color="primary" scaleWithText />
          </View>
          <Text variant="body" color="secondary" style={styles.title}>
            {item.detail}
          </Text>
        </View>
      </View>
      <FocusRing visible={focus.focused} radius={0} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  mark: { marginTop: 4 },
  texts: { flex: 1 },
  line: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' },
  detail: { justifyContent: 'flex-start', flexWrap: 'nowrap', marginTop: 2 },
  title: { flexShrink: 1 },
});
