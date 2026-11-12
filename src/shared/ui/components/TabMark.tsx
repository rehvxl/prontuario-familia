import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { HueName, HueTokens } from '../tokens';
import { useTheme, withHue } from '../theme';
import { categoricalIndexFor } from '../lib/identity';

export interface TabMarkProps {
  /** Id estável da pessoa (cor por `categoricalIndexFor`). */
  id?: string;
  /** Ou o matiz direto (ex.: 'ultramar' para a família). Vence `id`. */
  hue?: HueName | HueTokens;
  /** Padrão 'sm' (10 × 14, das linhas). 'md' = 14 × 20. */
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const SIZES = { sm: { width: 10, height: 14, radius: 4 }, md: { width: 14, height: 20, radius: 5 } } as const;

/**
 * Marca de aba v4: o pedacinho da divisória da pessoa ao lado de um item de lista ("Carlos · Glicose").
 * Decorativa: o nome da pessoa sempre vai escrito junto (a cor nunca é a única pista de quem é).
 */
export function TabMark({ id, hue, size = 'sm', style, testID }: TabMarkProps) {
  const theme = useTheme();
  const tokens = hue ? withHue(theme, hue).hue : id !== undefined ? theme.personBoard(categoricalIndexFor(id)) : theme.hue;
  const s = SIZES[size];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
      style={[
        { width: s.width, height: s.height, backgroundColor: tokens.tab, borderTopRightRadius: s.radius, borderBottomRightRadius: s.radius },
        style,
      ]}
    />
  );
}
