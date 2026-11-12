import { Children, createContext, Fragment, isValidElement, useContext, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { SectionHeader } from './SectionHeader';
import { Text } from './Text';

/** Dentro de uma ListSection, ListItem usa o recuo interno da seção em vez da margem da tela. */
export const ListSectionContext = createContext(false);
export const useInListSection = () => useContext(ListSectionContext);

export interface ListSectionProps {
  children: ReactNode;
  /** Cabeçalho da seção (frase curta, sem caixa alta), desenhado como `SectionHeader` (20 pt Bold). */
  header?: string;
  /** Nota abaixo da seção (explica uma consequência, ex.: "Ninguém fora da família vê."). */
  footer?: string;
  /**
   * @deprecated v4 — os fios da folha vão de ponta a ponta da coluna de texto (como as linhas de um manual);
   * o valor é aceito e ignorado.
   */
  separatorInset?: 'text' | 'none' | number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Lista da folha (v4): sem cartão, sem fundo próprio. Cada linha termina num fio fino (`border`), como as
 * linhas de um manual; a primeira começa logo abaixo do cabeçalho. Funciona igual dentro de `Leaf` ou numa
 * tela simples. Implementada em RN porque a List/Form do SwiftUI assume o scroll da tela inteira.
 */
export function ListSection({ children, header, footer, style, testID }: ListSectionProps) {
  const theme = useTheme();
  const items = Children.toArray(children).filter(isValidElement);
  const rule = { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border };
  return (
    <View style={[{ gap: theme.space[2] }, style]} testID={testID}>
      {/* O espaço entre seções é do pai; aqui só o respiro abaixo do cabeçalho (8 do gap + 2). */}
      {header ? <SectionHeader title={header} style={{ marginTop: 0, marginBottom: 2 }} /> : null}
      <View>
        <ListSectionContext.Provider value>
          {items.map((child, i) => (
            <Fragment key={child.key ?? i}>
              {child}
              <View style={rule} />
            </Fragment>
          ))}
        </ListSectionContext.Provider>
      </View>
      {footer ? (
        <Text variant="footnote" color="secondary">
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

