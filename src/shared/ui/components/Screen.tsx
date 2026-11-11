import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

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
  testID,
}: ScreenProps) {
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
  const contentBottom = footer ? theme.space[4] : bottomInset + theme.space[6];
  const centered: ViewStyle = { width: '100%', maxWidth: theme.layout.maxContentWidth, alignSelf: 'center' };

  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets={!footer}
      {...scrollViewProps}
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={[inner, { paddingBottom: contentBottom, paddingTop: (inner.paddingTop as number) + theme.space[4] }, contentContainerStyle]}
    >
      <View style={centered}>{children}</View>
    </ScrollView>
  ) : (
    <View style={[styles.flex, inner, { paddingBottom: footer ? 0 : bottomInset }, contentContainerStyle]}>
      <View style={[styles.flex, centered]}>{children}</View>
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

  // Em iOS com scroll e sem rodapé, o ScrollView ajusta o teclado sozinho e fica como primeiro filho
  // (necessário para o título grande do cabeçalho nativo encolher ao rolar).
  const needsAvoider = keyboardAvoiding && (Platform.OS !== 'ios' || !scroll || !!footer);
  if (!needsAvoider) {
    return (
      <View style={[styles.flex, { backgroundColor: bg }]} testID={testID}>
        {body}
        {footerEl}
      </View>
    );
  }
  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} testID={testID}>
      {body}
      {footerEl}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
