import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import type { HueName, HueTokens } from '../tokens';
import { HueProvider, useTheme, withHue } from '../theme';

/** A partir deste multiplicador de fonte a régua de abas deixa a borda direita e vira faixa no topo. */
export const RAIL_STRIP_FONT_SCALE = 1.35;

/** true quando a régua de abas deve ser a faixa horizontal no topo (texto ≥ 1,35×). */
export function useRailAsStrip(): boolean {
  return useWindowDimensions().fontScale >= RAIL_STRIP_FONT_SCALE;
}

export interface DividerBoardProps {
  /** A divisória: nome do matiz ou `theme.personBoard(i)`. Família = 'ultramar'. */
  hue: HueName | HueTokens;
  /** A folha (`Leaf`) e o que mais vai sobre a divisória. */
  children: ReactNode;
  /** A régua de abas (`TabRail`). Fica na borda direita; com texto ≥ 1,35×, no topo. */
  rail?: ReactNode;
  /**
   * Bordas com safe area. Com 'top' (tela sem cabeçalho), a folha começa logo abaixo da barra de status.
   * Padrão ['left', 'right'] (o cabeçalho nativo sobre a divisória já cuida do topo).
   */
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Fundo de cor plena da divisória da tela (v4), com a régua de abas na borda direita e a folha por cima.
 * Envolve os filhos em `HueProvider`: botões, links, gráfico e faixa do laudo ficam na tinta da pessoa.
 * Trocar `hue` troca a cor no mesmo quadro do conteúdo (o movimento fica na aba e no conteúdo da folha).
 * Decorativo para o leitor de tela: quem informa a pessoa é o título e a aba selecionada.
 */
export function DividerBoard({ hue, children, rail, edges = ['left', 'right'], style, testID }: DividerBoardProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const strip = useRailAsStrip();
  const shown = withHue(theme, hue).hue;
  const has = (e: Edge) => edges.includes(e);
  const top = (has('top') ? insets.top : 0) + theme.space[1];
  return (
    <View
      testID={testID}
      style={[
        styles.board,
        {
          backgroundColor: shown.board,
          paddingTop: top,
          paddingLeft: has('left') ? insets.left : 0,
          paddingRight: has('right') ? insets.right : 0,
          flexDirection: strip ? 'column' : 'row',
        },
        style,
      ]}
    >
      {strip && rail ? <View style={{ marginBottom: theme.space[1] }}>{rail}</View> : null}
      {/* A folha fica por cima da régua: a sombra da borda dela cai sobre as abas, que saem de trás. */}
      <View style={[styles.flex, styles.above]}>
        <HueProvider hue={hue}>{children}</HueProvider>
      </View>
      {!strip && rail ? <View style={{ width: theme.layout.railWidth }}>{rail}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { flex: 1 },
  flex: { flex: 1 },
  above: { zIndex: 1 },
});
