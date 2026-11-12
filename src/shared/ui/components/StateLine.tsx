import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { useIconScale } from '../lib/a11y';
import { REFERENCE_STATE_APPEARANCE, spokenState, type ReferenceState } from './clinical';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface StateLineProps {
  /** Estado de faixa do laudo. Dá o ícone e o texto ("acima da faixa do laudo"). */
  state?: ReferenceState;
  /** Valor já formatado, em destaque antes do estado ("138 mg/dL"). */
  value?: string;
  /** Texto próprio (vacinas: "Atrasada pelo calendário desde então"). Vence o texto do `state`. */
  text?: string;
  /** Ícone próprio (ex.: 'clock', 'calendar'). Vence o do `state`. */
  icon?: IconName;
  /** Leitura própria. Padrão: valor e texto, numa frase. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Linha de estado v4: ícone na tinta da divisória + texto. "↑ **138 mg/dL**, acima da faixa do laudo".
 * O estado é dito por ícone e palavras, nunca só por cor; nunca vermelho, nunca "normal" (spec §3.2).
 * Um elemento só para o leitor de tela.
 */
export function StateLine({ state, value, text, icon, accessibilityLabel, style, testID }: StateLineProps) {
  const theme = useTheme();
  const iconScale = useIconScale();
  const a = state ? REFERENCE_STATE_APPEARANCE[state] : undefined;
  const words = text ?? (a ? (value ? spokenState(state!) : a.long) : '');
  const glyph = icon ?? a?.icon;
  const label = accessibilityLabel ?? (value ? `${value}, ${words}` : words);
  return (
    <View accessible accessibilityLabel={label} testID={testID} style={[styles.row, { gap: theme.space[1] + 2 }, style]}>
      {glyph ? (
        // O ícone cresce com o texto e fica centrado na 1ª linha (22 − 18 = 4 pt de folga, metade em cima).
        <View style={{ marginTop: 2 * iconScale }}>
          <Icon name={glyph} size={18} weight="semibold" color="primary" scaleWithText />
        </View>
      ) : null}
      <Text variant="body" color="secondary" style={styles.text}>
        {value ? (
          <Text variant="bodyStrong" tabular>
            {value}
          </Text>
        ) : null}
        {value ? `, ${words}` : words}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  text: { flex: 1 },
});
