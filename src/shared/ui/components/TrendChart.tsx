import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { formatDecimal } from '../../lib/format';
import { useTheme } from '../theme';
import { useStackedLayout } from '../lib/a11y';
import { REFERENCE_STATE_APPEARANCE, type ReferenceRange, type ReferenceState } from './clinical';
import { Text } from './Text';

export interface TrendPoint {
  /** 'YYYY-MM-DD': posição no tempo. */
  date: string;
  /** Rótulo do eixo, já abreviado ("mar./25"). */
  label: string;
  value: number;
  /** Valor já formatado pelo domínio (casas do analito); sem ele, formatDecimal(value). */
  valueText?: string;
  state: ReferenceState;
  range?: ReferenceRange;
}

export interface TrendChartProps {
  /** Em ordem cronológica, só na unidade do resultado mais recente (R3). */
  points: TrendPoint[];
  unit: string;
  yDomain?: [number, number];
  /**
   * Obrigatório: visível abaixo do gráfico e lido como descrição da imagem ("Hemoglobina glicada:
   * 6 resultados de março de 2025 a outubro de 2026. Último: 7,4 %, acima da faixa do laudo.").
   */
  summary: string;
  onPointPress?: (index: number) => void;
  /** Padrão 196 (240 em AX3+). */
  height?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Legenda da forma cheia: só o último resultado vai preenchido (o estado de cada ponto é a forma). */
export const TREND_LAST_LEGEND = 'Cheio: último resultado';

/** Texto da spec (F2.3) quando a série tem um ponto só. */
export const TREND_SINGLE_POINT_TEXT = 'O gráfico aparece a partir do segundo resultado.';

/**
 * Faixa comum a todos os pontos (R4): só há banda quando todos têm a mesma faixa numérica. Senão `null`
 * e a faixa aparece por ponto na lista.
 */
export function sharedBand(points: readonly TrendPoint[]): ReferenceRange | null {
  const first = points[0]?.range;
  if (!first || (first.low === undefined && first.high === undefined)) return null;
  const same = points.every((p) => p.range?.low === first.low && p.range?.high === first.high);
  return same ? first : null;
}

/** Escala vertical com marcas "redondas" (1, 2, 2,5, 5 × 10ⁿ), cerca de `target` intervalos. */
export function niceScale(min: number, max: number, target = 3): { min: number; max: number; ticks: number[]; digits: number } {
  if (min === max) {
    const d = Math.abs(min) * 0.1 || 1;
    min -= d;
    max += d;
  }
  const raw = (max - min) / target;
  const n = Math.floor(Math.log10(raw));
  const pow = 10 ** n;
  const m = raw / pow;
  const nice = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  const step = nice * pow;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const digits = Math.max(0, -Math.floor(Math.log10(step) + 1e-9)) + (nice === 2.5 && step < 10 ? 1 : 0);
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Number(t.toFixed(digits)));
  return { min: lo, max: hi, ticks, digits };
}

const PAD = { left: 34, right: 18, top: 14, bottom: 24 };
const AXIS_FONT = 12;
const MIN_LABEL_GAP = 56;

const dayOf = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : Number.NaN;
};

function shapePath(state: ReferenceState, cx: number, cy: number): string | null {
  if (state === 'high') return `M${cx} ${cy - 5.2}L${cx + 4.6} ${cy + 3}L${cx - 4.6} ${cy + 3}Z`;
  if (state === 'low') return `M${cx} ${cy + 5.2}L${cx + 4.6} ${cy - 3}L${cx - 4.6} ${cy - 3}Z`;
  return null;
}

function bandText(range: ReferenceRange): string {
  if (range.text) return range.text;
  if (range.low !== undefined && range.high !== undefined) return `${formatDecimal(range.low)}–${formatDecimal(range.high)}`;
  return range.high !== undefined ? `< ${formatDecimal(range.high)}` : `> ${formatDecimal(range.low!)}`;
}

/**
 * Tendência de um exame contra a faixa do laudo. v4: linha e pontos na tinta da pessoa (`primary`); o estado
 * de cada ponto é a forma (círculo, triângulo para cima/baixo), nunca a cor; último cheio e com o valor
 * escrito; a legenda mostra cada forma vazada com o estado e a cheia como "último resultado"; banda no
 * `soft` da divisória, só pela R4. Eixos na Archivo, números tabulares. Sempre com resumo
 * visível e, na tela, a lista completa de resultados (a forma navegável).
 */
export function TrendChart({ points, unit, yDomain, summary, onPointPress, height = 196, style, testID }: TrendChartProps) {
  const theme = useTheme();
  const stacked = useStackedLayout();
  const [width, setWidth] = useState(0);
  const chartHeight = stacked ? Math.max(height, 240) : height;
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  const hasChart = points.length >= 2;
  const band = hasChart ? sharedBand(points) : null;

  const summaryText = (
    <Text
      variant="subheadline"
      // Com gráfico, o resumo já é o rótulo da imagem: o texto visível não é lido de novo.
      accessibilityElementsHidden={hasChart}
      importantForAccessibility={hasChart ? 'no-hide-descendants' : 'auto'}
      style={{ marginTop: theme.space[3] }}
    >
      {summary}
    </Text>
  );

  if (!hasChart) {
    return (
      <View style={style} testID={testID}>
        <Text variant="subheadline" color="secondary">
          {TREND_SINGLE_POINT_TEXT}
        </Text>
        {summaryText}
      </View>
    );
  }

  const values = points.map((p) => p.value);
  const limits = band ? [band.low, band.high].filter((n): n is number => n !== undefined) : [];
  const scale = niceScale(yDomain?.[0] ?? Math.min(...values, ...limits), yDomain?.[1] ?? Math.max(...values, ...limits));
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = chartHeight - PAD.top - PAD.bottom;
  const y = (v: number) => PAD.top + (1 - (v - scale.min) / (scale.max - scale.min)) * plotH;
  const days = points.map((p) => dayOf(p.date));
  const t0 = Math.min(...days);
  const t1 = Math.max(...days);
  const byTime = days.every(Number.isFinite) && t1 > t0;
  const x = (i: number) => PAD.left + (byTime ? (days[i]! - t0) / (t1 - t0) : i / (points.length - 1)) * plotW;

  const labelIdx: number[] = [];
  points.forEach((_, i) => {
    const prev = labelIdx[labelIdx.length - 1];
    const isLast = i === points.length - 1;
    if (prev === undefined || (x(i) - x(prev) >= MIN_LABEL_GAP && (isLast || x(points.length - 1) - x(i) >= MIN_LABEL_GAP))) labelIdx.push(i);
    else if (isLast) labelIdx[labelIdx.length - 1] = i;
  });

  const ink = theme.colors.textSecondary;
  const care = theme.colors.primary;
  const svgFont = theme.font('400');
  const last = points.length - 1;
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const bandTop = band ? y(band.high ?? scale.max) : 0;
  const bandBottom = band ? y(band.low ?? scale.min) : 0;
  const statesPresent = (['in', 'high', 'low', 'none'] as const).filter((s) => points.some((p) => p.state === s));

  return (
    <View style={style} testID={testID}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={summary}
        onLayout={onLayout}
        testID={testID ? `${testID}-chart` : undefined}
        style={{ height: chartHeight }}
      >
        {width > 0 ? (
          <Svg width={width} height={chartHeight}>
            {band ? (
              <G>
                <Rect x={PAD.left} y={bandTop} width={plotW} height={Math.max(0, bandBottom - bandTop)} fill={theme.colors.rangeBand} />
                {band.high !== undefined ? <Line x1={PAD.left} x2={PAD.left + plotW} y1={bandTop} y2={bandTop} stroke={care} strokeWidth={1} strokeDasharray="4 3" /> : null}
                {band.low !== undefined ? <Line x1={PAD.left} x2={PAD.left + plotW} y1={bandBottom} y2={bandBottom} stroke={care} strokeWidth={1} strokeDasharray="4 3" /> : null}
                <SvgText x={PAD.left + plotW - 4} y={Math.min(bandBottom - 4, bandTop + 15)} fontSize={AXIS_FONT} fontFamily={svgFont} fill={theme.colors.textSecondary} textAnchor="end">
                  {`faixa do laudo: ${bandText(band)}`}
                </SvgText>
              </G>
            ) : null}
            {scale.ticks.map((t) => (
              <G key={t}>
                <Line x1={PAD.left} x2={PAD.left + plotW} y1={y(t)} y2={y(t)} stroke={theme.colors.border} strokeWidth={1} />
                <SvgText x={PAD.left - 8} y={y(t) + 4} fontSize={AXIS_FONT} fontFamily={svgFont} fill={ink} textAnchor="end" fontFeatureSettings="'tnum'">
                  {formatDecimal(t.toFixed(scale.digits))}
                </SvgText>
              </G>
            ))}
            <Path d={linePath} fill="none" stroke={care} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, i) => {
              const color = care;
              const filled = i === last;
              const d = shapePath(p.state, x(i), y(p.value));
              const common = { fill: filled ? color : theme.colors.background, stroke: color, strokeWidth: 1.75 };
              return d ? <Path key={i} d={d} {...common} /> : <Circle key={i} cx={x(i)} cy={y(p.value)} r={4.5} {...common} />;
            })}
            <SvgText x={x(last) - 9} y={y(points[last]!.value) - 9} fontSize={13} fontFamily={theme.font('600')} fontWeight="600" fill={theme.colors.textPrimary} textAnchor="end" fontFeatureSettings="'tnum'">
              {`${points[last]!.valueText ?? formatDecimal(points[last]!.value)} ${unit}`}
            </SvgText>
            {labelIdx.map((i) => (
              <SvgText
                key={`x${i}`}
                x={x(i)}
                y={chartHeight - 6}
                fontSize={AXIS_FONT}
                fontFamily={svgFont}
                fill={ink}
                textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'}
                dx={i === 0 ? -10 : i === last ? 10 : 0}
                fontFeatureSettings="'tnum'"
              >
                {points[i]!.label}
              </SvgText>
            ))}
            {onPointPress
              ? points.map((p, i) => <Circle key={`hit${i}`} testID={testID ? `${testID}-point-${i}` : undefined} cx={x(i)} cy={y(p.value)} r={22} fill="transparent" onPress={() => onPointPress(i)} />)
              : null}
          </Svg>
        ) : null}
      </View>
      {/* A legenda repete o desenho do gráfico: forma vazada = estado de cada resultado; cheia = o último. */}
      <View style={[styles.legend, { gap: theme.space[4], marginTop: theme.space[2] }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {statesPresent.map((s) => (
          <LegendItem key={s} state={s} filled={false} color={care} hollow={theme.colors.background} label={REFERENCE_STATE_APPEARANCE[s].short} />
        ))}
        <LegendItem state={points[last]!.state} filled color={care} hollow={theme.colors.background} label={TREND_LAST_LEGEND} testID={testID ? `${testID}-legend-last` : undefined} />
      </View>
      {summaryText}
    </View>
  );
}

/** Item da legenda com a forma do estado, vazada ou cheia, no mesmo traço dos pontos. */
function LegendItem({ state, filled, color, hollow, label, testID }: { state: ReferenceState; filled: boolean; color: string; hollow: string; label: string; testID?: string }) {
  const d = shapePath(state, 7, 7.5);
  const common = { fill: filled ? color : hollow, stroke: color, strokeWidth: 1.5 };
  return (
    <View style={[styles.legendItem, { gap: 6 }]} testID={testID}>
      <Svg width={14} height={14}>
        {d ? <Path d={d} {...common} /> : <Circle cx={7} cy={7} r={4.5} {...common} />}
      </Svg>
      <Text variant="footnote" color="secondary">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
});
