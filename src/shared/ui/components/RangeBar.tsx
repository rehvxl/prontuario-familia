import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from '../theme';
import type { ReferenceRange, ReferenceState } from './clinical';

export interface RangeBarProps {
  value: number;
  range: ReferenceRange;
  /** Estado do valor. Mantido na API; a régua não o pinta (v4: o texto diz o estado). */
  state: ReferenceState;
  /** Largura em pt ou 'fill' (largura do pai). Padrão 112. */
  width?: number | 'fill';
  /** Marcador assenta do centro da faixa até o valor (300 ms). Padrão true; sem efeito com Reduzir movimento. */
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Posições na régua, em frações de 0 a 1 da largura. */
export interface RangeBarGeometry {
  band: { start: number; end: number };
  marker: number;
  /** De onde o marcador parte na animação: o centro da faixa. */
  origin: number;
}

/** Faixa ± 60% da largura dela. */
const SPREAD = 0.6;
/** Folga ao ampliar o domínio para caber o valor. */
const PADDING = 0.08;
/** Faixa aberta ("< 5,7"): largura de referência = 75% do limite. */
const OPEN_WIDTH = 0.75;
/** O domínio amplia até 3× o original; além disso o marcador encosta na borda. */
const MAX_GROWTH = 3;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Geometria da régua do laudo (DESIGN.md › RangeBar). `null` sem faixa numérica: trilho tracejado,
 * sem marcador. Domínio = faixa ± 60% da largura dela (faixa aberta: largura de referência de 75% do
 * limite), ampliado para caber o valor com 8% de folga até 3× o tamanho; valor além disso encosta na borda.
 */
export function rangeBarGeometry(value: number, range: ReferenceRange): RangeBarGeometry | null {
  const { low, high } = range;
  if (low === undefined && high === undefined) return null;
  const width = low !== undefined && high !== undefined ? high - low : OPEN_WIDTH * Math.abs((low ?? high)!) || 1;
  const bandLow = low ?? high!;
  const bandHigh = high ?? low!;
  let d0 = bandLow - SPREAD * width;
  let d1 = bandHigh + SPREAD * width;
  const base = d1 - d0;
  if (Number.isFinite(value) && (value < d0 || value > d1)) {
    const span = Math.max(d1, value) - Math.min(d0, value);
    const pad = PADDING * span;
    const limit = MAX_GROWTH * base;
    if (value < d0) d0 = Math.max(value - pad, d1 - limit);
    else d1 = Math.min(value + pad, d0 + limit);
  }
  const at = (v: number) => clamp01((v - d0) / (d1 - d0));
  const band = { start: low === undefined ? 0 : at(low), end: high === undefined ? 1 : at(high) };
  return { band, marker: Number.isFinite(value) ? at(value) : (band.start + band.end) / 2, origin: (band.start + band.end) / 2 };
}

const TRACK = 4;
const MARKER = 12;
const HEIGHT = 16;
const pct = (f: number) => `${(f * 100).toFixed(3)}%` as const;

/**
 * A régua do laudo (assinatura de dados v4): trilho de 4 pt, faixa em `rangeBand` (o `soft` da divisória),
 * marcador de 12 pt na tinta da pessoa (`primary`) com anel na cor da folha. `state` não pinta: o estado é
 * dito pelo `MetricValue`/`StateLine`. Decorativa para o leitor de tela.
 */
export function RangeBar({ value, range, width = 112, animated = true, style, testID }: RangeBarProps) {
  const theme = useTheme();
  const geometry = rangeBarGeometry(value, range);
  const animate = animated && !theme.motion.reduced && geometry !== null;
  const [progress] = useState(() => new Animated.Value(animate ? 0 : 1));
  useEffect(() => {
    if (!animate) return;
    const [x1, y1, x2, y2] = theme.motion.easing.out;
    // Só a primeira aparição: depois de assentado, o marcador segue o valor sem animar.
    Animated.timing(progress, { toValue: 1, duration: theme.motion.duration.slow, easing: Easing.bezier(x1, y1, x2, y2), useNativeDriver: false }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const box: StyleProp<ViewStyle> = [styles.box, width === 'fill' ? styles.fill : { width }, style];
  const hidden = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const, testID };

  if (!geometry) {
    return (
      <View {...hidden} style={box}>
        <Svg width="100%" height={HEIGHT}>
          <Line x1="0" x2="100%" y1={HEIGHT / 2} y2={HEIGHT / 2} stroke={theme.colors.rangeTrack} strokeWidth={TRACK} strokeDasharray="6 4" />
        </Svg>
      </View>
    );
  }
  const left = progress.interpolate({ inputRange: [0, 1], outputRange: [pct(geometry.origin), pct(geometry.marker)] });
  return (
    <View {...hidden} style={box}>
      <View style={[styles.track, { backgroundColor: theme.colors.rangeTrack, borderRadius: theme.radii.bar }]} />
      <View
        testID={testID ? `${testID}-band` : undefined}
        style={[styles.track, { left: pct(geometry.band.start), width: pct(geometry.band.end - geometry.band.start), right: undefined, backgroundColor: theme.colors.rangeBand, borderRadius: theme.radii.bar }]}
      />
      <Animated.View
        testID={testID ? `${testID}-marker` : undefined}
        style={[styles.marker, { left, backgroundColor: theme.colors.primary, borderColor: theme.colors.background }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { height: HEIGHT, justifyContent: 'center' },
  fill: { alignSelf: 'stretch' },
  track: { position: 'absolute', left: 0, right: 0, top: (HEIGHT - TRACK) / 2, height: TRACK },
  // Anel de 2 pt na cor da superfície: 12 pt de marcador + 2 de cada lado.
  marker: { position: 'absolute', top: (HEIGHT - MARKER) / 2 - 2, width: MARKER + 4, height: MARKER + 4, marginLeft: -(MARKER + 4) / 2, borderRadius: (MARKER + 4) / 2, borderWidth: 2 },
});
