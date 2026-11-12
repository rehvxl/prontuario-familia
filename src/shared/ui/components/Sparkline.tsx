import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Polyline } from 'react-native-svg';
import { useTheme } from '../theme';

export interface SparklineProps {
  /** 1 ou 2 séries (ex.: sistólica e diastólica), em ordem cronológica. */
  series: number[][];
  /** Padrão 132. */
  width?: number;
  /** Padrão 40. */
  height?: number;
  /** Obrigatório: o que o leitor de tela ouve ("6 medições em 30 dias, de 136/84 a 145/90; última 142/88"). */
  summary: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const STROKE = 1.75;
const DOT = 3;

/**
 * Evolução mínima, sem eixo nem faixa (sinais vitais lançados à mão não têm faixa de laudo).
 * Linha na tinta da pessoa (`primary`, v4); a segunda série a 50%; último ponto marcado (cheio na 1ª, vazado na 2ª).
 */
export function Sparkline({ series, width = 132, height = 40, summary, style, testID }: SparklineProps) {
  const theme = useTheme();
  const values = series.flat().filter(Number.isFinite);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = DOT + STROKE;
  const y = (v: number) => (max === min ? height / 2 : pad + (1 - (v - min) / (max - min)) * (height - 2 * pad));
  const x = (i: number, n: number) => (n <= 1 ? width / 2 : pad + (i / (n - 1)) * (width - 2 * pad));
  const color = theme.colors.primary;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary} testID={testID} style={[{ width, height }, style]}>
      {values.length > 0 ? (
        <Svg width={width} height={height}>
          {series.slice(0, 2).map((s, k) => {
            const pts = s.map((v, i) => `${x(i, s.length)},${y(v)}`).join(' ');
            const last = s[s.length - 1];
            return (
              <G key={k}>
                <Polyline points={pts} fill="none" stroke={color} strokeOpacity={k === 0 ? 1 : 0.5} strokeWidth={STROKE} strokeLinejoin="round" strokeLinecap="round" />
                {last !== undefined ? (
                  <Circle
                    cx={x(s.length - 1, s.length)}
                    cy={y(last)}
                    r={DOT}
                    fill={k === 0 ? color : theme.colors.background}
                    stroke={color}
                    strokeOpacity={k === 0 ? 1 : 0.5}
                    strokeWidth={STROKE}
                  />
                ) : null}
              </G>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}
