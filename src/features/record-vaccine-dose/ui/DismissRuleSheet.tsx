import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Banner, BottomSheet, Button, FieldMessage, Text, errorMessage, useTheme } from '@/shared/ui';
import { useMember } from '@/entities/member';
import { VACCINE_SCHEDULE, doseLabelOf, vaccineLabel, type DismissalReason } from '@/entities/vaccine';
import { useDismissVaccineRule } from '../model/hooks';

/** Motivos da F3.7, na ordem da spec. */
export const DISMISSAL_REASON_LABEL: Readonly<Record<DismissalReason, string>> = {
  had_disease: 'Já teve a doença',
  professional_advice: 'Orientação do profissional de saúde',
  other: 'Outro',
};
const REASONS = Object.keys(DISMISSAL_REASON_LABEL) as DismissalReason[];

export interface DismissRuleSheetProps {
  memberId: string;
  ruleId: string;
  onDone(): void;
  /** Padrão true. Deixe montada e alterne `visible` para a folha nativa sair com animação. */
  visible?: boolean;
}

/** "Não se aplica" (F3.7): pede o motivo e tira a indicação das pendências. Desfazer fica na carteira. */
export function DismissRuleSheet({ memberId, ruleId, onDone, visible = true }: DismissRuleSheetProps) {
  const theme = useTheme();
  const familyId = useMember(memberId).data?.familyId;
  const dismiss = useDismissVaccineRule();
  const [reason, setReason] = useState<DismissalReason | null>(null);
  const [attempted, setAttempted] = useState(false);
  const rule = VACCINE_SCHEDULE.find((r) => r.id === ruleId);

  const close = () => {
    setReason(null);
    setAttempted(false);
    dismiss.reset();
    onDone();
  };
  const save = () => {
    setAttempted(true);
    if (!familyId || !reason) return;
    dismiss.mutate({ familyId, memberId, ruleId, reason, note: null }, { onSuccess: close });
  };

  const subject = rule ? `${vaccineLabel(rule.vaccineCode)} · ${rule.doseLabel ?? doseLabelOf(rule.doseKey)}. ` : '';
  return (
    <BottomSheet visible={visible} onClose={dismiss.isPending ? () => undefined : close} title="Não se aplica" message={`${subject}Escolha o motivo.`} testID="dismiss-rule-sheet">
      {dismiss.error ? <Banner tone="danger" message={errorMessage(dismiss.error, 'Não foi possível salvar. Tente novamente.')} style={{ marginBottom: theme.space[4] }} /> : null}
      <View accessibilityRole="radiogroup" accessibilityLabel="Motivo">
        {REASONS.map((value) => {
          const checked = reason === value;
          return (
            <Pressable
              key={value}
              onPress={() => setReason(value)}
              accessibilityRole="radio"
              accessibilityLabel={DISMISSAL_REASON_LABEL[value]}
              accessibilityState={{ checked }}
              style={({ pressed }) => [
                styles.option,
                { minHeight: theme.minTouchTarget + 4, gap: theme.space[3], borderRadius: theme.radii.md, paddingHorizontal: theme.space[2] },
                pressed && { backgroundColor: theme.colors.surfaceSunken },
              ]}
            >
              <View style={[styles.ring, { borderColor: checked ? theme.colors.primary : theme.colors.borderStrong }]}>
                {checked ? <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} /> : null}
              </View>
              <Text variant="body" style={styles.flex}>
                {DISMISSAL_REASON_LABEL[value]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <FieldMessage error={attempted && !reason ? 'Escolha o motivo.' : null} />
      <View style={{ gap: theme.space[3], marginTop: theme.space[4] }}>
        <Button label="Salvar motivo" onPress={save} loading={dismiss.isPending} disabled={!familyId} fullWidth testID="dismiss-save" />
        <Button label="Cancelar" variant="secondary" onPress={close} disabled={dismiss.isPending} fullWidth />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center' },
  ring: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  flex: { flex: 1 },
});
