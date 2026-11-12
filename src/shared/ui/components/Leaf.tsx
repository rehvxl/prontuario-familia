import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { HueProvider, useTheme } from '../theme';
import { ScreenInsetContext } from './screenInset';

export interface LeafProps {
  children: ReactNode;
  /**
   * Padrão true: o conteúdo rola dentro da folha. Com false, a folha só desenha o fundo; o filho (ex.: FlatList)
   * cuida da rolagem e usa `leafContentInset(theme)`.
   */
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollViewProps?: Omit<ScrollViewProps, 'contentContainerStyle' | 'children'>;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Recuo do conteúdo na folha: margem à esquerda e respiro à direita (a régua de abas já afasta a borda). */
export function leafContentInset(theme: ReturnType<typeof useTheme>): ViewStyle {
  return { paddingLeft: theme.layout.leafMargin, paddingRight: theme.layout.leafGutter };
}

/**
 * A folha v4: papel de tom fixo sobre a divisória (`hue.leaf`; grafite leitoso no escuro), canto superior direito
 * arredondado, sem furos (custavam largura e liam como marcador), e borda pousada sobre a divisória (sombra suave no alto e à
 * direita: as abas saem de trás dela). Use dentro de `DividerBoard` (ou `Screen board`, que já monta os dois).
 * Os filhos recebem `colors.background` = `hue.leaf`. Conteúdo em fios finos (ListSection), sem cartões.
 */
export function Leaf({ children, scroll = true, contentContainerStyle, scrollViewProps, style, testID }: LeafProps) {
  const theme = useTheme();
  const inset = leafContentInset(theme);
  const radius = { borderTopRightRadius: theme.radii.leaf };
  const resting = theme.scheme === 'dark' ? 'rgba(0, 0, 0, 0.55)' : 'rgba(5, 10, 40, 0.24)';
  return (
    // A sombra fica no invólucro: no iOS, `overflow: hidden` da folha cortaria a sombra externa.
    <View testID={testID} style={[styles.leaf, radius, { backgroundColor: theme.hue.leaf, boxShadow: `2px -1px 6px ${resting}` }, style]}>
      <View style={[styles.flex, styles.clip, radius]}>
        <HueProvider hue={theme.hue} leaf>
          <ScreenInsetContext.Provider value={theme.layout.leafMargin}>
            {scroll ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentInsetAdjustmentBehavior="automatic"
                {...scrollViewProps}
                style={styles.flex}
                contentContainerStyle={[inset, { paddingTop: theme.space[4], paddingBottom: theme.space[6] }, contentContainerStyle]}
              >
                {children}
              </ScrollView>
            ) : (
              children
            )}
          </ScreenInsetContext.Provider>
        </HueProvider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  leaf: { flex: 1, borderCurve: 'continuous' },
  clip: { overflow: 'hidden', borderCurve: 'continuous' },
  flex: { flex: 1 },
});
