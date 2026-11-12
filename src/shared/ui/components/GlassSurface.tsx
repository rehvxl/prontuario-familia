import { GlassView } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';

export type GlassSurfaceShape = 'capsule' | 'container' | 'card' | 'circle';

export interface GlassSurfaceProps {
  children?: ReactNode;
  /** Padrão 'capsule'. Define o raio (cápsula = altura/2 via 999). */
  shape?: GlassSurfaceShape;
  /** Vidro reage ao toque (só para controles). Padrão false. */
  interactive?: boolean;
  /** Tinta sutil (ex.: theme.colors.primary para uma ação primária flutuante). */
  tint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** Passa direto para o View (ex.: accessible, accessibilityRole). */
  accessible?: boolean;
  accessibilityLabel?: string;
}

/**
 * Camada de vidro (Liquid Glass, iOS 26+) para elementos que FLUTUAM sobre conteúdo:
 * barra de ação, FAB, pílula de status. Nunca para cartões, listas ou fundos de tela.
 *
 * Fallback (Android, iOS < 26, "Reduzir transparência" ativo): superfície sólida elevada com
 * contorno fino — mesma forma, mesma legibilidade. Nunca aplica opacity < 1 no GlassView
 * (quebra o efeito no iOS).
 */
export function GlassSurface({
  children,
  shape = 'capsule',
  interactive = false,
  tint,
  style,
  testID,
  accessible,
  accessibilityLabel,
}: GlassSurfaceProps) {
  const theme = useTheme();
  const radius =
    shape === 'capsule' || shape === 'circle' ? 999 : shape === 'container' ? theme.radii.container : theme.radii.card;
  const shapeStyle: ViewStyle = { borderRadius: radius, borderCurve: 'continuous', overflow: 'hidden' };
  const a11y = { accessible, accessibilityLabel, testID };

  if (Platform.OS === 'ios' && theme.glass.enabled) {
    return (
      <GlassView
        glassEffectStyle="regular"
        isInteractive={interactive}
        tintColor={tint}
        colorScheme={theme.scheme}
        style={[shapeStyle, style]}
        {...a11y}
      >
        {children}
      </GlassView>
    );
  }
  return (
    <View
      style={[
        shapeStyle,
        { backgroundColor: theme.colors.surfaceRaised },
        // Fio ou sombra, nunca os dois (v3): sombra "Flutuante" no claro, fio no escuro (onde não há sombra).
        theme.scheme === 'dark' && { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
        theme.elevation(2),
        // overflow hidden corta a sombra no iOS; a sombra fica no wrapper só fora do iOS.
        Platform.OS === 'ios' && { overflow: 'visible' },
        style,
      ]}
      {...a11y}
    >
      {children}
    </View>
  );
}
