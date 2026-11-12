import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMember } from '@/entities/member';
import { medicationEndOn } from '@/entities/medication';
import { formatShortDate, isDomainError, toLocalIsoDate } from '@/shared/lib';
import { Banner, Button, DateField, FieldLabel, FieldMessage, LoadErrorState, TextField, Text, errorMessage, useTheme } from '@/shared/ui';
import { buildMedicationInput, type MedicationPlan } from '../domain/medication-input';
import { useAddMedication } from '../model/hooks';

/** A5 (spec §3.3): rodapé de toda tela de medicamentos. */
export const MEDICATION_FOOTNOTE = 'Lista para consulta. Não mude o tratamento sem falar com o profissional de saúde.';

export interface MedicationFormProps {
  memberId: string;
  onSaved(): void;
}

type PlanKind = 'continuous' | 'until' | 'days';
type Field = 'name' | 'start' | 'plan' | 'end' | 'days';

const PLAN_OPTIONS: readonly { value: PlanKind; label: string }[] = [
  { value: 'continuous', label: 'Uso contínuo' },
  { value: 'until', label: 'Até uma data' },
  { value: 'days', label: 'Por um número de dias' },
];

/** Código do `DomainError` de `buildMedicationInput` → campo que mostra a mensagem. */
const FIELD_OF: Record<string, Field> = {
  'medication/missing-name': 'name',
  'medication/name-too-long': 'name',
  'medication/invalid-start': 'start',
  'medication/missing-plan': 'plan',
  'medication/invalid-end': 'end',
  'medication/end-before-start': 'end',
  'medication/invalid-days': 'days',
};

const parseDays = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : NaN);

function toPlan(kind: PlanKind | null, endOn: string | null, days: string): MedicationPlan | undefined {
  if (kind === 'continuous') return { kind };
  if (kind === 'until') return { kind, endOn: endOn ?? '' };
  if (kind === 'days') return { kind, days: parseDays(days) };
  return undefined;
}

/**
 * Adicionar medicamento (F4.3, F4.5): nome, dosagem, instrução, início (padrão hoje) e a escolha
 * obrigatória entre "Uso contínuo", "Até {data}" e "Por {n} dias" (R6). Nada começa escolhido.
 */
export function MedicationForm({ memberId, onSaved }: MedicationFormProps) {
  const theme = useTheme();
  const member = useMember(memberId || undefined);
  const add = useAddMedication();
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [startOn, setStartOn] = useState<string | null>(() => toLocalIsoDate());
  const [plan, setPlan] = useState<PlanKind | null>(null);
  const [endOn, setEndOn] = useState<string | null>(null);
  const [days, setDays] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  if (member.isError) return <LoadErrorState onRetry={() => void member.refetch()} />;

  const daysEnd = plan === 'days' && startOn ? medicationEndOn(startOn, { kind: 'days', days: parseDays(days) }) : undefined;
  const clear = (field: Field) => setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));

  const save = () => {
    setFormError(null);
    try {
      const input = buildMedicationInput({
        memberId,
        familyId: member.data?.familyId ?? '',
        name,
        dosage,
        instructions,
        startOn: startOn ?? '',
        // Sem escolha, vai undefined: o domínio recusa com "Escolha por quanto tempo." (F4.3).
        plan: toPlan(plan, endOn, days) as MedicationPlan,
      });
      setErrors({});
      add.mutate(input, {
        onSuccess: () => onSaved(),
        onError: (error) => setFormError(errorMessage(error, 'Não foi possível salvar. Tente de novo.')),
      });
    } catch (error) {
      const field = isDomainError(error) ? FIELD_OF[error.code] : undefined;
      if (field) setErrors({ [field]: (error as Error).message });
      else setFormError(errorMessage(error, 'Não foi possível salvar. Tente de novo.'));
    }
  };

  return (
    <View style={{ gap: theme.space[5] }}>
      {formError ? <Banner tone="danger" message={formError} /> : null}
      <TextField
        label="Nome"
        value={name}
        onChangeText={(t) => {
          setName(t);
          clear('name');
        }}
        error={errors.name}
        autoCapitalize="sentences"
        returnKeyType="next"
        testID="medication-name"
      />
      <TextField label="Dosagem" optional value={dosage} onChangeText={setDosage} testID="medication-dosage" />
      <TextField label="Instrução" optional value={instructions} onChangeText={setInstructions} multiline testID="medication-instructions" />
      <DateField
        label="Início"
        value={startOn}
        onChange={(d) => {
          setStartOn(d);
          clear('start');
          clear('end');
          clear('days');
        }}
        error={errors.start}
        testID="medication-start"
      />

      <View>
        <FieldLabel label="Por quanto tempo" nativeID="medication-plan-label" />
        <View accessibilityRole="radiogroup" accessibilityLabel="Por quanto tempo" style={{ gap: theme.space[2] }} testID="medication-plan">
          {PLAN_OPTIONS.map((opt) => (
            <PlanOption
              key={opt.value}
              label={opt.label}
              selected={plan === opt.value}
              onPress={() => {
                setPlan(opt.value);
                clear('plan');
              }}
            />
          ))}
        </View>
        <FieldMessage error={errors.plan} />
      </View>

      {plan === 'until' ? (
        <DateField
          label="Data de término"
          value={endOn}
          minimumDate={startOn ?? undefined}
          onChange={(d) => {
            setEndOn(d);
            clear('end');
          }}
          error={errors.end}
          testID="medication-end"
        />
      ) : null}
      {plan === 'days' ? (
        <TextField
          label="Número de dias"
          value={days}
          onChangeText={(t) => {
            setDays(t);
            clear('days');
          }}
          keyboardType="number-pad"
          helper={daysEnd ? `Até ${formatShortDate(daysEnd)}` : undefined}
          error={errors.days}
          testID="medication-days"
        />
      ) : null}

      <Button label="Salvar medicamento" onPress={save} loading={add.isPending} disabled={member.isPending} fullWidth testID="save-medication" />
      <Text variant="footnote" color="secondary">
        {MEDICATION_FOOTNOTE}
      </Text>
    </View>
  );
}

/** Opção de rádio de linha inteira (≥ 44 pt, quebra em AX5); o SegmentedControl não comporta 3 rótulos longos. */
function PlanOption({ label, selected, onPress }: { label: string; selected: boolean; onPress(): void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, selected }}
      android_ripple={{ color: theme.colors.border }}
      style={({ pressed }) => [
        styles.option,
        {
          minHeight: theme.minTouchTarget,
          borderRadius: theme.radii.field,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? theme.colors.primary : theme.colors.borderStrong,
          backgroundColor: selected ? theme.colors.primarySoft : pressed ? theme.colors.surfaceSunken : theme.colors.surface,
          paddingHorizontal: theme.space[4] - (selected ? 1 : 0),
          paddingVertical: theme.space[3],
          gap: theme.space[3],
        },
      ]}
    >
      <View style={[styles.ring, { borderColor: selected ? theme.colors.primary : theme.colors.borderStrong }]}>
        {selected ? <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} /> : null}
      </View>
      <Text variant={selected ? 'bodyStrong' : 'body'} style={styles.flex}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center' },
  ring: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  flex: { flex: 1 },
});
