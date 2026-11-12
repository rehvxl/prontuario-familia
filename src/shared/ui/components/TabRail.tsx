import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import type { HueName, HueTokens } from '../tokens';
import { useTheme, withHue } from '../theme';
import { FocusRing, useFocusState } from '../lib/focus';
import { selectionFeedback } from '../lib/haptics';
import { useRailAsStrip } from './DividerBoard';
import { Text } from './Text';

export interface TabRailItem {
  id: string;
  /** Nome curto escrito na aba ("Carlos", "Família"). */
  label: string;
  /** Documentos da pessoa: define a altura da aba e vai escrito nela. Sem número, a aba não mostra contagem. */
  count?: number;
  /** Matiz da divisória dessa aba. */
  hue: HueName | HueTokens;
  selected?: boolean;
  /** Padrão: "{label}, {n} documentos". */
  accessibilityLabel?: string;
}

export interface TabRailProps {
  items: readonly TabRailItem[];
  onSelect: (id: string) => void;
  /** Nome da régua para o leitor de tela. Padrão "Divisórias da pasta". */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Respiros da aba (10 em cima + 8 embaixo). */
const TAB_PAD = 18;
/**
 * shortcut: largura média por letra do rótulo (subheadline 15 pt Bold, Archivo SemiCondensed), para a aba caber
 * no nome sem sobrar vão; troque por medição (onTextLayout) se o rótulo variar muito.
 */
const LABEL_CHAR = 8;
const TAB_GAP = 6;
/** O rótulo vertical não cresce além do limiar da faixa (acima de 1,35× a régua vira faixa no topo). */
const RAIL_FONT_CAP = 1.35;
/** No iOS o papel `tab` não vira traço de acessibilidade: o VoiceOver leria a aba sem dizer que é tocável. */
export const RAIL_TAB_ROLE = Platform.OS === 'ios' ? 'button' : 'tab';
/** Altura da linha da contagem no pé da aba. */
const COUNT_LINE = 20;
/** Quanto a aba não selecionada fica recolhida atrás da folha. */
const TAB_TUCK = 5;

/**
 * Altura de cada aba, fixa: a selecionada não cresce, para a régua nunca se reorganizar na troca. As abas com
 * contagem (pessoas) têm todas a mesma altura, a do maior nome mais a linha do número; a sem contagem
 * (Família) fica do tamanho do nome. `fontScale` (até 1,35×) alonga os nomes.
 */
export function tabHeights(items: readonly (Pick<TabRailItem, 'count'> & { label?: string })[], min: number, fontScale = 1): number[] {
  const scale = Math.min(Math.max(fontScale, 1), RAIL_FONT_CAP);
  const labelLen = (i: { label?: string }) => (i.label?.length ?? 0) * LABEL_CHAR * scale + TAB_PAD;
  const counted = items.filter((i) => i.count !== undefined);
  const person = Math.max(min, ...counted.map((i) => labelLen(i) + COUNT_LINE));
  return items.map((i) => Math.round(i.count === undefined ? Math.max(min, labelLen(i)) : person));
}

const docs = (n: number) => (n === 1 ? '1 documento' : `${n} documentos`);
const tabLabel = (i: TabRailItem) => i.accessibilityLabel ?? (i.count === undefined ? i.label : `${i.label}, ${docs(i.count)}`);

/**
 * Régua de abas v4: trocador de pessoa na borda direita da divisória. Uma aba por pessoa, na cor dela, todas da
 * mesma altura, com a contagem escrita; a aba atual sai de trás da folha até a borda (120 ms) e se funde à cor
 * da divisória. Com texto ≥ 1,35× vira faixa horizontal no topo (`DividerBoard` já reposiciona).
 * Leitor de tela: `tablist` com `tab` + selecionado. Não é o único caminho para uma pessoa (a lista também é).
 */
export function TabRail({ items, onSelect, accessibilityLabel = 'Divisórias da pasta', style, testID }: TabRailProps) {
  const theme = useTheme();
  const strip = useRailAsStrip();
  const { fontScale } = useWindowDimensions();
  const heights = tabHeights(items, theme.layout.tabMinHeight, fontScale);
  const select = (item: TabRailItem) => {
    if (item.selected) return;
    selectionFeedback();
    onSelect(item.id);
  };
  if (strip) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={[styles.stripScroll, style]}
        contentContainerStyle={{ paddingHorizontal: theme.space[2], gap: TAB_GAP }}
      >
        {items.map((item) => (
          <StripTab key={item.id} item={item} onPress={() => select(item)} />
        ))}
      </ScrollView>
    );
  }
  return (
    <ScrollView
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      showsVerticalScrollIndicator={false}
      testID={testID}
      style={style}
      contentContainerStyle={{ gap: TAB_GAP, paddingBottom: theme.space[6] }}
    >
      {items.map((item, i) => (
        <RailTab key={item.id} item={item} height={heights[i]!} onPress={() => select(item)} />
      ))}
    </ScrollView>
  );
}

interface TabProps {
  item: TabRailItem;
  onPress: () => void;
}

function useTabColors(item: TabRailItem) {
  const theme = useTheme();
  const hue = withHue(theme, item.hue).hue;
  // A aba atual é a própria divisória (cor plena, sem sombra); as outras, a face da aba de cada pessoa.
  return item.selected ? { bg: theme.hue.board, fg: theme.hue.onBoard } : { bg: hue.tab, fg: hue.onTab };
}

function RailTab({ item, height, onPress }: TabProps & { height: number }) {
  const theme = useTheme();
  const focus = useFocusState();
  const { bg, fg } = useTabColors(item);
  const selected = !!item.selected;
  // A aba atual também mostra a contagem: o número não some ao abrir a divisória da pessoa.
  const showCount = item.count !== undefined;
  const width = theme.layout.railWidth;
  // A aba não selecionada fica recolhida atrás da folha; a selecionada sai até a borda (só transform: nada se reorganiza).
  const [tuck] = useState(() => new Animated.Value(selected ? 0 : -TAB_TUCK));
  useEffect(() => {
    Animated.timing(tuck, { toValue: selected ? 0 : -TAB_TUCK, duration: theme.motion.reduced ? 0 : theme.motion.boardSwap.tab, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [selected, tuck, theme.motion.reduced, theme.motion.boardSwap.tab]);
  // O alvo conta só a parte visível da aba (a recolhida fica atrás da folha).
  const slop = Math.max(0, (theme.minTouchTarget - (width - TAB_TUCK)) / 2);
  // Comprimento do rótulo: a aba menos os respiros (10 + 8) e a linha da contagem.
  const labelBox = Math.max(0, height - TAB_PAD - (showCount ? COUNT_LINE : 0));
  return (
    <Animated.View style={{ transform: [{ translateX: tuck }] }}>
      <Pressable
        onPress={onPress}
        onFocus={focus.onFocus}
        onBlur={focus.onBlur}
        hitSlop={{ left: slop, right: slop }}
        accessibilityRole={RAIL_TAB_ROLE}
        accessibilityLabel={tabLabel(item)}
        accessibilityState={{ selected }}
        testID={`tab-${item.id}`}
        style={({ pressed }) => [
          styles.tab,
          {
            height,
            width,
            backgroundColor: bg,
            borderTopRightRadius: selected ? 0 : theme.radii.tab,
            borderBottomRightRadius: selected ? 0 : theme.radii.tab,
            paddingTop: 10,
            paddingBottom: 8,
            paddingLeft: TAB_TUCK,
            justifyContent: showCount ? 'space-between' : 'flex-start',
          },
          !selected && styles.tabShadow,
          pressed && !selected && { opacity: 0.85 },
        ]}
      >
        {/* O rótulo gira 90° (de cima para baixo, como numa aba de pasta); a caixa medida dá o comprimento. */}
        <View style={{ height: labelBox, width: width - TAB_TUCK }}>
          <View style={[styles.rotated, { width: labelBox, height: width - TAB_TUCK, left: (width - TAB_TUCK - labelBox) / 2, top: (labelBox - width + TAB_TUCK) / 2 }]}>
            <Text
              variant="subheadline"
              numberOfLines={1}
              maxFontSizeMultiplier={RAIL_FONT_CAP}
              style={{ color: fg, fontWeight: selected ? '700' : '600', lineHeight: 18 }}
            >
              {item.label}
            </Text>
          </View>
        </View>
        {showCount ? (
          <Text variant="subheadline" tabular maxFontSizeMultiplier={RAIL_FONT_CAP} align="center" style={{ color: fg, fontWeight: selected ? '700' : '500', width: width - TAB_TUCK }}>
            {item.count}
          </Text>
        ) : null}
        <FocusRing visible={focus.focused} radius={theme.radii.tab} />
      </Pressable>
    </Animated.View>
  );
}

function StripTab({ item, onPress }: TabProps) {
  const theme = useTheme();
  const focus = useFocusState();
  const { bg, fg } = useTabColors(item);
  const selected = !!item.selected;
  return (
    <Pressable
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      accessibilityRole={RAIL_TAB_ROLE}
      accessibilityLabel={tabLabel(item)}
      accessibilityState={{ selected }}
      testID={`tab-${item.id}`}
      style={({ pressed }) => [
        styles.stripTab,
        {
          minHeight: theme.minTouchTarget,
          backgroundColor: bg,
          borderBottomLeftRadius: theme.radii.tab,
          borderBottomRightRadius: theme.radii.tab,
          paddingHorizontal: theme.space[3],
          gap: theme.space[2],
        },
        !selected && styles.tabShadow,
        pressed && !selected && { opacity: 0.85 },
      ]}
    >
      <Text variant="subheadline" style={{ color: fg, fontWeight: selected ? '700' : '600' }}>
        {item.label}
      </Text>
      {item.count !== undefined ? (
        <Text variant="subheadline" tabular style={{ color: fg, fontWeight: '500' }}>
          {item.count}
        </Text>
      ) : null}
      <FocusRing visible={focus.focused} radius={theme.radii.tab} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: { alignItems: 'center' },
  // Sombra curta da aba sobre a divisória (a aba atual não tem: é a própria divisória).
  tabShadow: { boxShadow: '0 1px 3px rgba(5, 10, 40, 0.35)' },
  rotated: { position: 'absolute', justifyContent: 'center', transform: [{ rotate: '90deg' }] },
  stripScroll: { flexGrow: 0 },
  stripTab: { flexDirection: 'row', alignItems: 'center' },
});
