import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { formatShortDate } from '@/shared/lib';
import { Icon, Text, useTheme } from '@/shared/ui';
import type { MedicationStatus } from '../domain/types';

export interface MedicationRowProps {
  name: string;
  dosage?: string | null;
  instructions?: string | null;
  startOn: string;
  endOn: string | null;
  /** R5, calculado no domínio (`medicationStatus`). */
  status: MedicationStatus;
  /** S5, pronta: "Do documento {título}, {data}" ou "Registrado por você". */
  origin: string;
  onPress?: () => void;
  testID?: string;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Textos da linha (DESIGN.md › MedicationRow). Exportado para o leitor de tela e os testes usarem a mesma frase. */
export function medicationRowTexts({ name, dosage, instructions, startOn, endOn, status }: Omit<MedicationRowProps, 'origin' | 'onPress' | 'testID'>) {
  const title = [name, dosage].filter(Boolean).join(' ');
  const plan = endOn === null ? 'uso contínuo' : `até ${formatShortDate(endOn)}`;
  // Encerrado: a data de fim já está na linha de estado.
  const parts = status === 'ended' ? [instructions] : [instructions, plan];
  const subtitle = capitalize(parts.filter(Boolean).join(' · '));
  const state =
    status === 'scheduled' ? `Começa em ${formatShortDate(startOn)}` : status === 'ended' && endOn ? `Encerrado em ${formatShortDate(endOn)}` : null;
  return { title, subtitle, state };
}

/**
 * Medicamento numa linha da folha (`ListSection`, F4): nome + dosagem, instrução e plano, estado (só "Começa em" e
 * "Encerrado em"; "Em uso" é o cabeçalho da seção) e a origem em 13 pt. Um elemento de acessibilidade.
 * Sem `numberOfLines`: em AX5 o texto quebra, nunca corta.
 */
export function MedicationRow({ onPress, origin, testID, ...item }: MedicationRowProps) {
  const theme = useTheme();
  const { title, subtitle, state } = medicationRowTexts(item);
  const ended = item.status === 'ended';
  const label = [title, subtitle, state, origin].filter(Boolean).join(', ');

  const content = (
    <>
      <View style={styles.texts}>
        <Text variant="headline" color={ended ? 'secondary' : 'primary'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="subheadline" color="secondary" style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
        {state ? (
          <Text variant="subheadline" color="secondary" tabular style={{ marginTop: 2 }}>
            {state}
          </Text>
        ) : null}
        <Text variant="footnote" color="secondary" style={{ marginTop: theme.space[1] }}>
          {origin}
        </Text>
      </View>
      {onPress && Platform.OS === 'ios' ? (
        <View style={styles.chevron}>
          <Icon name="forward" size={15} weight="semibold" color="textTertiary" />
        </View>
      ) : null}
    </>
  );

  // v4: linha da folha, sem tile e sem recuo próprio (a `ListSection` desenha o fio embaixo).
  const rowStyle = [styles.row, { minHeight: 64, paddingVertical: theme.space[3], gap: theme.space[3] }];
  if (!onPress) {
    return (
      <View style={rowStyle} accessible accessibilityLabel={label} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Abre os detalhes do medicamento"
      android_ripple={{ color: theme.colors.border }}
      testID={testID}
      style={({ pressed }) => [rowStyle, pressed && Platform.OS !== 'android' && { backgroundColor: theme.colors.surfaceSunken }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  texts: { flex: 1 },
  chevron: { alignSelf: 'center' },
});
