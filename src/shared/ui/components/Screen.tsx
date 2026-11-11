import { createContext, useContext, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

/** Recuo lateral que o `Screen` aplica ao conteúdo (margem + safe area). 0 fora de um Screen com padding. */
const ScreenInsetContext = createContext(0);
/** Para componentes que sangram até a borda (ChipGroup, carrosséis): compensam este recuo com margem negativa. */
export const useScreenHorizontalInset = () => useContext(ScreenInsetContext);

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
  /** Padrão 'background'. */
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
  testID,
}: ScreenProps) {
  const sheet = presentation === 'sheet';
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const has = (e: Edge) => edges.includes(e);
  const bottomInset = has('bottom') ? insets.bottom : 0;
  const bg = theme.colors[background];

  const inner: ViewStyle = {
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

  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets={!footer}
      {...scrollViewProps}
      testID={scrollTestID}
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={[inner, { paddingBottom: contentBottom, paddingTop: (inner.paddingTop as number) + theme.space[4] }, contentContainerStyle]}
    >
      <View style={centered} testID={contentTestID}>
        <ScreenInsetContext.Provider value={contentInset}>{children}</ScreenInsetContext.Provider>
      </View>
    </ScrollView>
  ) : (
    <View style={[styles.flex, inner, { paddingBottom: footer ? 0 : bottomInset }, sheet && { backgroundColor: bg }, contentContainerStyle]} testID={sheet ? testID : undefined}>
      <View style={[styles.flex, centered]}>
        <ScreenInsetContext.Provider value={contentInset}>{children}</ScreenInsetContext.Provider>
      </View>
    </View>
  );

  const footerEl = footer ? (
    <View
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

  // Em iOS com scroll e sem rodapé, o ScrollView ajusta o teclado sozinho e é a própria raiz, como uma
  // FlatList: sem view intermediária com cor (que vira UIView), o UIKit acompanha o ScrollView para o título
  // grande encolher ao rolar e não desloca o conteúdo quando a tela volta a ter foco.
  if (scrollIsRoot) return body;
  // Folha nativa: a raiz não pode ter cor opaca nem testID (ver doc de `presentation`). O fundo vai no corpo/rodapé.
  const rootBg: ViewStyle | undefined = sheet ? undefined : { backgroundColor: bg };
  if (!needsAvoider) {
    return (
      <View style={[styles.flex, rootBg]} testID={rootTestID}>
        {body}
        {footerEl}
      </View>
    );
  }
  return (
    <KeyboardAvoidingView style={[styles.flex, rootBg]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} testID={rootTestID}>
      {body}
      {footerEl}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
