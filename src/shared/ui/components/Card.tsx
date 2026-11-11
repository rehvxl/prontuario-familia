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
   * Divisória colorida no topo do cartão (assinatura visual: a aba da pasta de documentos).
   * Índice da paleta categórica. Sempre acompanhe com texto/ícone — a cor sozinha não informa.
   */
  tab?: CategoricalIndex;
  /** Padrão 1. */
  elevation?: ElevationLevel;
  /** Padrão true (16 pt). */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Card({ children, onPress, accessibilityLabel, accessibilityHint, tab, elevation = 1, padded = true, style, testID }: CardProps) {
  const theme = useTheme();
  const focus = useFocusState();
  const radius = theme.radii.lg;
  const base: StyleProp<ViewStyle> = [
    { backgroundColor: theme.scheme === 'dark' && elevation > 0 ? theme.colors.surfaceRaised : theme.colors.surface, borderRadius: radius },
    padded && { padding: theme.space[4] },
    theme.elevation(elevation),
  ];
  const tabEl =
    tab !== undefined ? (
      <View
        pointerEvents="none"
        style={[styles.tab, { backgroundColor: theme.categorical[tab]?.main, left: theme.space[4], borderTopLeftRadius: 3, borderTopRightRadius: 3 }]}
      />
    ) : null;

  if (!onPress) {
    return (
      <View style={[base, style]} testID={testID}>
        {tabEl}
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
      style={({ pressed }) => [base, pressed && Platform.OS !== 'android' && { opacity: 0.85 }, style]}
    >
      {tabEl}
      {children}
      <FocusRing visible={focus.focused} radius={radius} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: { position: 'absolute', top: -5, width: 36, height: 5 },
});
