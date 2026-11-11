import { Children, createContext, Fragment, isValidElement, useContext, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { Text } from './Text';

/** Dentro de uma ListSection, ListItem usa o recuo interno da seção em vez da margem da tela. */
export const ListSectionContext = createContext(false);
export const useInListSection = () => useContext(ListSectionContext);

export interface ListSectionProps {
  children: ReactNode;
  /** Cabeçalho da seção (frase curta, sem caixa alta). */
  header?: string;
  /** Nota abaixo da seção (explica uma consequência, ex.: "Ninguém fora da família vê."). */
  footer?: string;
  /**
   * Recuo do separador: 'text' (padrão) alinha com o título, como no iOS quando há ícone/avatar
   * (16 + 44 + 12); 'none' alinha com a borda interna (16).
   */
  separatorInset?: 'text' | 'none' | number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Lista agrupada inset (iOS "insetGrouped"; no Android, lista Material sobre superfície com cantos de 26).
 * Implementada em RN porque a List/Form do SwiftUI assume o scroll da tela inteira e não convive com
 * ScrollView/FlatList do RN. Separadores finos entre itens; o grupo é o container de raio 26.
 */
export function ListSection({ children, header, footer, separatorInset = 'text', style, testID }: ListSectionProps) {
  const theme = useTheme();
  const items = Children.toArray(children).filter(isValidElement);
  const inset = typeof separatorInset === 'number' ? separatorInset : separatorInset === 'text' ? 16 + 44 + 12 : 16;
  return (
    <View style={[{ gap: theme.space[2] }, style]} testID={testID}>
      {header ? (
        <Text
          variant={Platform.OS === 'ios' ? 'headline' : 'subheadline'}
          color="primary"
          accessibilityRole="header"
          style={{ paddingHorizontal: theme.space[4] }}
        >
          {header}
        </Text>
      ) : null}
      <View
        style={[
          styles.group,
          { backgroundColor: theme.colors.surface, borderRadius: theme.radii.container },
        ]}
      >
        <ListSectionContext.Provider value>
          {items.map((child, i) => (
            <Fragment key={child.key ?? i}>
              {i > 0 ? (
                <View
                  style={{
                    height: StyleSheet.hairlineWidth,
                    marginLeft: inset,
                    backgroundColor: theme.colors.border,
                  }}
                />
              ) : null}
              {child}
            </Fragment>
          ))}
        </ListSectionContext.Provider>
      </View>
      {footer ? (
        <Text variant="footnote" color="secondary" style={{ paddingHorizontal: theme.space[4] }}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { overflow: 'hidden', borderCurve: 'continuous' },
});
