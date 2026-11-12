import type { ComponentRef, ReactNode, Ref } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import type { HueName, HueTokens } from '../tokens';
import { useTheme } from '../theme';
import { DividerBoard } from './DividerBoard';
import { Leaf } from './Leaf';
import { ScreenInsetContext } from './screenInset';
import { Text } from './Text';

export { useScreenHorizontalInset } from './screenInset';

/** Altura do FAB (estendido ou não): 56 dp no Android; no iOS a cápsula `extraLarge` fica em ~52–56 pt. */
export const FLOATING_ACTION_HEIGHT = 56;
/** Altura da pílula flutuante (`Banner appearance="floating"`, ex.: offline). */
const FLOATING_PILL_HEIGHT = 44;

export interface FloatingFooterInsetOptions {
  /** A tela tem FAB. Padrão true. */
  fab?: boolean;
  /** Quantas pílulas flutuantes ficam acima do FAB (ex.: 1 quando offline). Padrão 0. */
  pills?: number;
}

/**
 * Altura que o rodapé flutuante (FAB + pílulas, acima da barra de abas) ocupa na base da tela, com folga.
 * Some ao `contentContainerStyle.paddingBottom` de listas/telas com FAB para a última linha rolar acima
 * dele e nunca ficar coberta. A barra de abas nativa já entra no safe area inferior.
 * Mesma conta da camada `FloatingActions`: base em `insets.bottom + space[3]`, itens separados por `space[3]`.
 */
export function useFloatingFooterInset({ fab = true, pills = 0 }: FloatingFooterInsetOptions = {}) {
  const theme = useTheme();
  const { bottom } = useSafeAreaInsets();
  const items = (fab ? [FLOATING_ACTION_HEIGHT] : []).concat(Array.from({ length: pills }, () => FLOATING_PILL_HEIGHT));
  if (items.length === 0) return 0;
  const stack = items.reduce((sum, h) => sum + h, 0) + theme.space[3] * (items.length - 1);
  return bottom + theme.space[3] + stack + theme.space[4];
}

/**
 * Véu do token `background` na altura da barra de status, com 12 pt de fade. Para telas cujo conteúdo
 * rola sob a barra de status (cabeçalho transparente sem título, ou sem cabeçalho): o texto deixa de
 * passar ilegível sob o relógio e os ícones do sistema. Não recebe toques nem foco.
 * O `Screen` já desenha o véu sozinho (prop `veil`); use direto só em telas com FlatList própria,
 * como irmão **depois** da lista (a lista continua o primeiro filho, para o cabeçalho nativo acompanhar).
 */
export function ScrollEdgeVeil({ testID = 'scroll-edge-veil' }: { testID?: string }) {
  const theme = useTheme();
  const { top } = useSafeAreaInsets();
  if (top <= 0) return null;
  const bg = theme.colors.background;
  // Fade para o mesmo tom sem alfa (não para `transparent`, que interpola por preto).
  const clear = /^#[0-9a-f]{6}$/i.test(bg) ? `${bg}00` : 'transparent';
  const fade = theme.space[3];
  const solidStop = Math.round((top / (top + fade)) * 100);
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
      style={[styles.veil, { height: top + fade, backgroundImage: `linear-gradient(to bottom, ${bg} ${solidStop}%, ${clear} 100%)` }]}
    />
  );
}

export interface ScreenProps {
  children: ReactNode;
  /** Padrão true. Formulários e detalhes rolam; listas longas usam FlatList com scroll={false}. */
  scroll?: boolean;
  /** Margem lateral padrão da tela. Padrão true. */
  padded?: boolean;
  /**
   * Bordas que recebem safe area. Padrão ['left','right','bottom'] — o cabeçalho nativo do
   * expo-router já cuida do topo. Telas sem cabeçalho (boas-vindas) passam ['top','left','right','bottom'].
   */
  edges?: readonly Edge[];
  /** Área fixa na base (ação principal do formulário). Sobe com o teclado. */
  footer?: ReactNode;
  /** Padrão 'background' (o `paper` do tema, v3). */
  background?: 'background' | 'surface';
  keyboardAvoiding?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollViewProps?: Omit<ScrollViewProps, 'contentContainerStyle' | 'children'>;
  /**
   * Padrão 'screen'. Use 'sheet' em telas apresentadas como `formSheet` nativo (iOS 26):
   * a raiz do Screen fica "achatável" pelo Fabric — sem cor de fundo e sem `testID` — e a cor vai
   * no ScrollView, na área fixa e no corpo. Uma view raiz que vira UIView de verdade (cor opaca,
   * `testID`) deixa o corpo da folha sem pintar (iOS 26.5, react-native-screens 4.30, Expo Go).
   * Em 'sheet', o `testID` do Screen vai para o corpo (ScrollView, ou o conteúdo se
   * `scrollViewProps.testID` existir). Visualmente igual a 'screen'.
   */
  presentation?: 'screen' | 'sheet';
  /**
   * Título da tela-raiz no conteúdo (`largeTitle`, 34 pt Bold na tinta da divisória), com subtítulo
   * opcional (ex.: a data de hoje). Use com `headerOptions(theme, { contentTitle: true })`: o cabeçalho
   * nativo fica só com botões.
   */
  heading?: {
    title: string;
    subtitle?: string;
    /** Ação ao lado do título (ex.: "Editar pessoa"), alinhada à primeira linha. */
    trailing?: ReactNode;
    /** Título anunciado como cabeçalho e testID do bloco (o painel da família troca o título sem trocar de tela). */
    testID?: string;
  };
  /** Ref da rolagem (ex.: voltar ao topo quando o conteúdo da mesma tela troca). Só com `scroll`. */
  scrollRef?: Ref<ComponentRef<typeof ScrollView>>;
  /**
   * v4: tela sobre uma divisória. O fundo vira a cor plena do matiz, o conteúdo vai numa `Leaf` (a folha) e
   * tudo abaixo usa a tinta da pessoa (`HueProvider`). Use com
   * `headerOptions(theme, { board })` (cabeçalho opaco na cor da divisória) ou sem cabeçalho e `edges`
   * com 'top'. Ignorado em `presentation="sheet"` (folhas e formulários ficam na folha simples).
   */
  board?: HueName | HueTokens;
  /** v4: régua de abas (`TabRail`) na borda direita da divisória. Só com `board`. */
  rail?: ReactNode;
  /**
   * Véu na altura da barra de status (`ScrollEdgeVeil`). Padrão: ligado quando o conteúdo rola sob a
   * barra de status, ou seja, com `edges` incluindo 'top' (sem cabeçalho) ou, no iOS, com `heading`
   * (telas-raiz com cabeçalho transparente sem título). Nunca em `presentation="sheet"`.
   * Passe false se a tela tiver `heading` sob um cabeçalho opaco.
   */
  veil?: boolean;
  testID?: string;
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  edges = ['left', 'right', 'bottom'],
  footer,
  background = 'background',
  keyboardAvoiding = true,
  contentContainerStyle,
  scrollViewProps,
  presentation = 'screen',
  heading,
  scrollRef,
  veil,
  board: boardProp,
  rail,
  testID,
}: ScreenProps) {
  const sheet = presentation === 'sheet';
  const board = sheet ? undefined : boardProp;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const has = (e: Edge) => edges.includes(e);
  const bottomInset = has('bottom') ? insets.bottom : 0;
  const bg = theme.colors[background];
  // Na divisória a folha começa abaixo da barra de status e recorta o conteúdo: sem véu.
  const showVeil = !sheet && !board && (veil ?? (has('top') || (Platform.OS === 'ios' && !!heading)));
  const veilEl = showVeil ? <ScrollEdgeVeil /> : null;

  // Na divisória, o safe area de cima e dos lados fica com o `DividerBoard`; a folha dá a margem do texto.
  const inner: ViewStyle = board
    ? { paddingTop: 0, paddingLeft: padded ? theme.layout.leafMargin : 0, paddingRight: padded ? theme.layout.leafGutter : 0 }
    : {
        paddingTop: has('top') ? insets.top : 0,
        paddingLeft: (has('left') ? insets.left : 0) + (padded ? theme.layout.screenGutter : 0),
        paddingRight: (has('right') ? insets.right : 0) + (padded ? theme.layout.screenGutter : 0),
      };
  // Recuo à esquerda (margem + safe area) que um filho precisa desfazer para sangrar até a borda.
  const contentInset = inner.paddingLeft as number;
  const contentBottom = footer ? theme.space[4] : bottomInset + theme.space[6];
  // Quem recebe o testID: na folha, nunca a raiz (ver `presentation`); sem wrapper, o próprio ScrollView.
  const needsAvoider = keyboardAvoiding && (Platform.OS !== 'ios' || !scroll || !!footer);
  const scrollIsRoot = scroll && !needsAvoider && !footer;
  const rootTestID = sheet || scrollIsRoot ? undefined : testID;
  const scrollTestID = scrollViewProps?.testID ?? (sheet || scrollIsRoot ? testID : undefined);
  const contentTestID = scrollViewProps?.testID && (sheet || scrollIsRoot) ? testID : undefined;
  const centered: ViewStyle = { width: '100%', maxWidth: theme.layout.maxContentWidth, alignSelf: 'center' };
  const headingEl = heading ? (
    <View style={{ marginBottom: theme.space[4], gap: theme.space[1] }} testID={heading.testID}>
      <View style={styles.headingRow}>
        <Text variant="largeTitle" color="link" accessibilityRole="header" style={styles.flex}>
          {heading.title}
        </Text>
        {heading.trailing}
      </View>
      {heading.subtitle ? (
        <Text variant="subheadline" color="secondary">
          {heading.subtitle}
        </Text>
      ) : null}
    </View>
  ) : null;

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets={!footer}
      {...scrollViewProps}
      testID={scrollTestID}
      // Na divisória a folha já pinta o tom da pessoa; um fundo aqui (o da tela, de fora da folha) cobriria o tom.
      style={{ flex: 1, backgroundColor: board ? undefined : bg }}
      contentContainerStyle={[inner, { paddingBottom: contentBottom, paddingTop: (inner.paddingTop as number) + (heading ? theme.space[2] : theme.space[4]) }, contentContainerStyle]}
    >
      <View style={centered} testID={contentTestID}>
        {headingEl}
        <ScreenInsetContext.Provider value={contentInset}>{children}</ScreenInsetContext.Provider>
      </View>
    </ScrollView>
  ) : (
    <View style={[styles.flex, inner, { paddingBottom: footer ? 0 : bottomInset }, sheet && { backgroundColor: bg }, contentContainerStyle]} testID={sheet ? testID : undefined}>
      <View style={[styles.flex, centered]}>
        {headingEl}
        <ScreenInsetContext.Provider value={contentInset}>{children}</ScreenInsetContext.Provider>
      </View>
    </View>
  );

  const footerEl = footer ? (
    <View
      collapsable={false}
      style={{
        paddingHorizontal: theme.layout.screenGutter,
        paddingTop: theme.space[3],
        paddingBottom: bottomInset + theme.space[3],
        backgroundColor: bg,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.border,
      }}
    >
      <View style={centered}>{footer}</View>
    </View>
  ) : null;

  if (board) {
    const leafBody = needsAvoider ? (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {body}
        {footerEl}
      </KeyboardAvoidingView>
    ) : (
      <>
        {body}
        {footerEl}
      </>
    );
    return (
      <DividerBoard hue={board} rail={rail} edges={edges.filter((e) => e !== 'bottom')} testID={rootTestID ?? 'screen-board'}>
        <Leaf scroll={false}>{leafBody}</Leaf>
      </DividerBoard>
    );
  }

  // Em iOS com scroll e sem rodapé, o ScrollView ajusta o teclado sozinho e é a própria raiz, como uma
  // FlatList: sem view intermediária com cor (que vira UIView), o UIKit acompanha o ScrollView para o título
  // grande encolher ao rolar e não desloca o conteúdo quando a tela volta a ter foco.
  if (scrollIsRoot) {
    return veilEl ? (
      <>
        {body}
        {veilEl}
      </>
    ) : (
      body
    );
  }
  // Folha nativa: a raiz não pode ter cor opaca nem testID (ver doc de `presentation`). O fundo vai no corpo/rodapé.
  const rootBg: ViewStyle | undefined = sheet ? undefined : { backgroundColor: bg };
  // Folha com rolagem e rodapé: o react-native-screens procura o ScrollView entre os filhos diretos do
  // contêiner da folha (e na cadeia de primeiros filhos) e força o frame dele para a folha inteira, o que
  // gera o aviso "FormSheet with ScrollView expects at most 2 subviews" e esconde o fim do conteúdo sob o
  // rodapé. A raiz real (`collapsable={false}`, ainda sem cor nem testID) com um primeiro filho vazio tira o
  // ScrollView do alcance dessa correção, e o layout do React (rolagem + rodapé) vale como está.
  const sheetGuard = sheet && scroll && footer;
  const guard = sheetGuard ? <View collapsable={false} /> : null;
  if (!needsAvoider) {
    return (
      <View style={[styles.flex, rootBg]} testID={rootTestID} collapsable={sheetGuard ? false : undefined}>
        {guard}
        {body}
        {footerEl}
        {veilEl}
      </View>
    );
  }
  return (
    <KeyboardAvoidingView
      style={[styles.flex, rootBg]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID={rootTestID}
      collapsable={sheetGuard ? false : undefined}
    >
      {guard}
      {body}
      {footerEl}
      {veilEl}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  veil: { position: 'absolute', top: 0, left: 0, right: 0 },
});
