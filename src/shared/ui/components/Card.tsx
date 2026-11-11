import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { CategoricalIndex, ElevationLevel } from '../tokens';
import { useTheme } from '../theme';
import { FocusRing, useFocusState } from '../lib/focus';

export interface CardProps {
  children: ReactNode;
  /** Torna o cartão tocável (o conteúdo é lido como um único elemento). */
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /**
   * Acento categórico: a "aba da pasta", uma cápsula curta na cor da categoria no topo do cartão.
   * Sempre acompanhe com texto/ícone — a cor sozinha não informa.
   */
  accent?: CategoricalIndex;
  /** @deprecated v1 — use `accent`. */
  tab?: CategoricalIndex;
  /**
   * Padrão 0 (v2): cartão claro sobre o fundo agrupado, sem sombra, como as células do iOS.
   * Use 1+ só para algo que flutua sobre conteúdo.
   */
  elevation?: ElevationLevel;
  /** Padrão true (16 pt). */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Cartão de conteúdo (raio 20, concêntrico ao container 26). Nunca use vidro em cartão de conteúdo. */
export function Card({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accent,
  tab,
  elevation = 0,
  padded = true,
  style,
  testID,
}: CardProps) {
  const theme = useTheme();
  const focus = useFocusState();
  const radius = theme.radii.card;
  const accentIndex = accent ?? tab;
  const base: StyleProp<ViewStyle> = [
    {
      backgroundColor: theme.scheme === 'dark' && elevation > 0 ? theme.colors.surfaceRaised : theme.colors.surface,
      borderRadius: radius,
      borderCurve: 'continuous',
    },
    padded && { padding: theme.space[4] },
    accentIndex !== undefined && padded && { paddingTop: theme.space[4] + 10 },
    theme.elevation(elevation),
  ];
  const accentEl =
    accentIndex !== undefined ? (
      <View
        pointerEvents="none"
        style={[styles.accent, { backgroundColor: theme.categorical[accentIndex]?.main, left: theme.space[4] }]}
      />
    ) : null;

  if (!onPress) {
    return (
      <View style={[base, style]} testID={testID}>
        {accentEl}
        {children}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      android_ripple={{ color: theme.colors.border, foreground: true }}
      testID={testID}
      style={({ pressed }) => [
        base,
        styles.clip,
        pressed && Platform.OS !== 'android' && { backgroundColor: theme.colors.surfaceSunken },
        style,
      ]}
    >
      {accentEl}
      {children}
      <FocusRing visible={focus.focused} radius={radius} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  accent: { position: 'absolute', top: 12, width: 28, height: 4, borderRadius: 2 },
  clip: { overflow: Platform.OS === 'android' ? 'hidden' : 'visible' },
});
