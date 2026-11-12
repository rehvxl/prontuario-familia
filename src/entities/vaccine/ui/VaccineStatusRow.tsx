import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Icon, StateLine, Text, useTheme, type IconName } from '@/shared/ui';
import type { VaccineStatus } from '../domain/types';

interface StatusAppearance {
  /** Texto da spec (§5 e F3.1). */
  label: string;
  /** Ícone ao lado do texto, na tinta da pessoa: o estado é dito por ícone e palavras, nunca só por cor. */
  icon: IconName;
}

/** Status → texto e ícone (v4). Sem tom próprio: nunca vermelho, nunca uma cor que se confunda com outra pessoa. */
export const VACCINE_STATUS_APPEARANCE: Readonly<Record<VaccineStatus, StatusAppearance>> = {
  late: { label: 'Atrasada pelo calendário', icon: 'clock' },
  due: { label: 'Pendente', icon: 'calendar' },
  confirm: { label: 'Confirmar na carteira', icon: 'clipboard' },
  next: { label: 'Próxima', icon: 'calendar' },
  planned: { label: 'Prevista', icon: 'calendar' },
  noRecord: { label: 'Sem registro', icon: 'stateNone' },
  applied: { label: 'Aplicada', icon: 'stateIn' },
  notApplicable: { label: 'Não se aplica', icon: 'close' },
};

export interface VaccineStatusRowProps {
  vaccineName: string;
  status: VaccineStatus;
  /** "Anual para 60 anos ou mais · a partir de 1 de jan. de 2026". */
  detail: string;
  /** "Nenhuma dose registrada em 2026", "Lote PN2205 · UBS Jardim". */
  doses?: string;
  /** Origem do item (S5): "Registrado por você" ou "Do documento {título}, {data}". */
  origin?: string;
  onPress?: () => void;
  accessibilityHint?: string;
  /** Controle à direita (ex.: "Desfazer"), focável à parte do resto da linha. */
  trailing?: ReactNode;
  testID?: string;
}

/**
 * Linha da carteira como linha de tabela da folha (v4): nome, detalhe, linhas de apoio e o status numa
 * `StateLine` (ícone + texto). Use dentro de `ListSection` (o fio fica por conta dela).
 * O leitor de tela ouve "Influenza de 2026, pendente, …" num elemento só.
 */
export function VaccineStatusRow({ vaccineName, status, detail, doses, origin, onPress, accessibilityHint, trailing, testID }: VaccineStatusRowProps) {
  const theme = useTheme();
  const [pressed, setPressed] = useState(false);
  const a = VACCINE_STATUS_APPEARANCE[status];
  const label = [vaccineName, a.label.toLocaleLowerCase('pt-BR'), detail, doses, origin]
    .filter(Boolean)
    .join(', ')
    .split(' · ')
    .join(', ');
  const rowStyle = { paddingVertical: theme.space[3], gap: theme.space[3], minHeight: theme.layout.rowMinHeight };

  const content = (
    <>
      <View style={styles.texts}>
        <Text variant="headline">{vaccineName}</Text>
        <Text variant="subheadline" color="secondary" tabular style={styles.line}>
          {detail}
        </Text>
        {doses ? (
          <Text variant="footnote" color="secondary" tabular style={styles.line}>
            {doses}
          </Text>
        ) : null}
        {origin ? (
          <Text variant="footnote" color="secondary" style={styles.line}>
            {origin}
          </Text>
        ) : null}
        <StateLine icon={a.icon} text={a.label} style={{ marginTop: theme.space[1] }} />
      </View>
      {onPress && !trailing && Platform.OS === 'ios' ? <Icon name="forward" size={15} weight="semibold" color="textTertiary" /> : null}
    </>
  );

  const main = onPress ? (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      android_ripple={{ color: theme.colors.border }}
      testID={testID}
      style={[styles.row, rowStyle, trailing ? styles.main : null]}
    >
      {content}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={label} testID={testID} style={[styles.row, rowStyle, trailing ? styles.main : null]}>
      {content}
    </View>
  );

  const pressedBg = pressed && Platform.OS !== 'android' ? { backgroundColor: theme.colors.surfaceSunken } : null;
  if (!trailing) return <View style={pressedBg}>{main}</View>;
  return (
    <View style={[styles.row, pressedBg]}>
      {main}
      <View>{trailing}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  main: { flex: 1 },
  texts: { flex: 1 },
  line: { marginTop: 2 },
});
