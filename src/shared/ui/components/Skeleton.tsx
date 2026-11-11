import { useEffect, useState } from 'react';
import { Animated, Easing, View, type DimensionValue } from 'react-native';
import { useTheme } from '../theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  /** Padrão radii.sm. Use 999 para círculo. */
  radius?: number;
}

/** Bloco de carregamento. Pulsa devagar; parado com "Reduzir movimento". Invisível para leitores de tela. */
export function Skeleton({ width = '100%', height = 16, radius }: SkeletonProps) {
  const theme = useTheme();
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (theme.motion.reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.55, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, theme.motion.reduced]);
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height, borderRadius: radius ?? theme.radii.sm, backgroundColor: theme.colors.surfaceSunken, opacity }}
    />
  );
}

/** Esqueleto de uma linha de lista (avatar + duas linhas). Use 3–5 seguidos. */
export function SkeletonListItem() {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[3], paddingHorizontal: theme.layout.screenGutter, paddingVertical: theme.space[3] }}>
      <Skeleton width={44} height={44} radius={22} />
      <View style={{ flex: 1, gap: theme.space[2] }}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" height={14} />
      </View>
    </View>
  );
}
