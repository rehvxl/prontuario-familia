import type { StyleProp } from 'react-native';
import { StyleSheet } from 'react-native';
import { headerTitleStyles, type Theme } from '../theme';

/** Subconjunto das props do `Stack.Title` do expo-router que o DS ajusta (sem importar a navegação). */
export interface TitleStyleProps {
  style?: StyleProp<object>;
  largeStyle?: StyleProp<object>;
}

/**
 * Props do `Stack.Title` já com a cor e a fonte do título do DS (label do sistema e Archivo; o tint fica só nos botões).
 * `style`/`largeStyle` do chamador vencem — inclusive `color`, se for de propósito.
 * Para telas, prefira `ScreenTitle`/`LargeTitle` de `@/shared/ui/navigation`.
 */
export function screenTitleProps<P extends TitleStyleProps>(theme: Theme, props: P): P & { style: object; largeStyle: object } {
  const colors = headerTitleStyles(theme);
  return {
    ...props,
    style: { ...colors.headerTitleStyle, ...(StyleSheet.flatten(props.style) as object) },
    largeStyle: { ...colors.headerLargeTitleStyle, ...(StyleSheet.flatten(props.largeStyle) as object) },
  };
}
