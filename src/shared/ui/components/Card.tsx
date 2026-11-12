import { useEffect, type ReactNode } from 'react';
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
   * @deprecated v3 — no-op. A pílula de acento no topo do cartão saiu do design (DESIGN.md › Shapes).
   * Mostre a categoria com ícone + rótulo (ex.: `Badge colorIndex`).
   */
  accent?: CategoricalIndex;
  /** @deprecated v1 — no-op desde a v3, como `accent`. */
  tab?: CategoricalIndex;
  /** v3: 'tinted' usa `surfaceTinted` (cartão de "agora" que destaca sem cor). Padrão 'default'. */
  tone?: 'default' | 'tinted';
  /**
   * Padrão 0: folha `surface` com fio de 1 pt, sem sombra (v3). Use 2 só para algo que flutua sobre
   * conteúdo (sombra, sem fio).
   */
  elevation?: ElevationLevel;
  /** Padrão true (16 pt). */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

let warnedAccent = false;

/** Cartão de conteúdo (raio 16, fio `border`). Nunca use vidro em cartão de conteúdo nem aninhe cartões. */
export function Card({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accent,
  tab,
  tone = 'default',
  elevation = 0,
  padded = true,
  style,
  testID,
}: CardProps) {
  const theme = useTheme();
  const focus = useFocusState();
  const radius = theme.radii.card;
  const deprecatedAccent = (accent ?? tab) !== undefined;
  useEffect(() => {
    if (!__DEV__ || !deprecatedAccent || warnedAccent) return;
    warnedAccent = true;
    console.warn('Card: `accent`/`tab` não tem efeito desde o design system v3. Use ícone + rótulo.');
  }, [deprecatedAccent]);
  const bg =
    tone === 'tinted'
      ? theme.colors.surfaceTinted
      : theme.scheme === 'dark' && elevation > 1
        ? theme.colors.surfaceRaised
        : theme.colors.surface;
  const base: StyleProp<ViewStyle> = [
    { backgroundColor: bg, borderRadius: radius, borderCurve: 'continuous' },
    padded && { padding: theme.space[4] },
    theme.elevation(elevation),
  ];

  if (!onPress) {
    return (
      <View style={[base, style]} testID={testID}>
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
      {children}
      <FocusRing visible={focus.focused} radius={radius} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: Platform.OS === 'android' ? 'hidden' : 'visible' },
});
