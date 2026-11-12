import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { formatDecimal, isDomainError, toLocalIsoDate } from '@/shared/lib';
import {
  Banner,
  Button,
  ChipGroup,
  DateField,
  FieldLabel,
  Select,
  Text,
  TextField,
  errorMessage,
  useStackedLayout,
  useTheme,
} from '@/shared/ui';
import { useMember } from '@/entities/member';
import { VITALS, spokenUnit, type MeasurementContext, type NewMeasurement, type VitalCode } from '@/entities/measurement';
import { validateVitalInput } from '../domain/validate';
import { useAddMeasurement } from '../model/hooks';

export interface VitalEntryFormProps {
  memberId: string;
  kind?: VitalCode;
  onSaved(): void;
}

/** F5.1: rótulos do momento da glicemia capilar. */
const GLUCOSE_CONTEXT_LABELS: Record<MeasurementContext, string> = {
  fasting: 'Em jejum',
  post_meal: 'Após refeição',
  other: 'Outro momento',
};

const KIND_OPTIONS = VITALS.map((v) => ({ value: v.code, label: v.label }));
const CONTEXT_OPTIONS = (Object.keys(GLUCOSE_CONTEXT_LABELS) as MeasurementContext[]).map((value) => ({ value, label: GLUCOSE_CONTEXT_LABELS[value] }));
const VALUE_LABEL: Record<Exclude<VitalCode, 'bp'>, string> = { glucose_capillary: 'Glicemia capilar', weight: 'Peso', height: 'Altura' };

const pad2 = (n: number) => String(n).padStart(2, '0');
const nowTime = (now: Date) => `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

/** A4 com o primeiro nome da pessoa (spec §3.3). */
const vitalsFootnote = (fullName: string) =>
  `O app não avalia estes valores. Mostre a sequência ao profissional que acompanha ${fullName.trim().split(/\s+/)[0]}.`;

/** A14 (spec §3.3) para o valor que pediu conferência. */
const improbableValueMessage = (m: Pick<NewMeasurement, 'value' | 'value2' | 'unit'>) =>
  `Confira o valor: ${formatDecimal(m.value)}${m.value2 !== null ? `/${formatDecimal(m.value2)}` : ''} ${m.unit} parece fora do que um aparelho costuma medir.`;

/**
 * Registrar sinal vital (spec F5.1–F5.3). Valida digitação plausível, nunca normalidade (S3, S10):
 * sistólica ≤ diastólica bloqueia; fora dos limites de digitação pede conferência (A14). Sem IMC.
 */
export function VitalEntryForm({ memberId, kind, onSaved }: VitalEntryFormProps): ReactElement {
  const theme = useTheme();
  const stacked = useStackedLayout();
  const member = useMember(memberId);
  const add = useAddMeasurement();
  const [code, setCode] = useState<VitalCode | null>(kind ?? null);
  const [value, setValue] = useState('');
  const [value2, setValue2] = useState('');
  const [context, setContext] = useState<MeasurementContext | null>(null);
  const [takenOn, setTakenOn] = useState<string | null>(() => toLocalIsoDate());
  const [takenAt, setTakenAt] = useState(() => nowTime(new Date()));
  const [problem, setProblem] = useState<string | null>(null);
  const [toConfirm, setToConfirm] = useState<NewMeasurement | null>(null);

  const vital = VITALS.find((v) => v.code === code);
  const unitSpoken = vital ? spokenUnit(vital.unit) : '';
  // Qualquer edição invalida a mensagem e a conferência pendente.
  const edit =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setProblem(null);
      setToConfirm(null);
    };

  const save = (m: NewMeasurement) => add.mutate(m, { onSuccess: () => onSaved() });

  const submit = () => {
    const familyId = member.data?.familyId;
    if (!familyId) return;
    try {
      const { value: m, needsConfirmation } = validateVitalInput({
        familyId,
        memberId,
        code,
        value,
        value2: code === 'bp' ? value2 : null,
        takenOn: takenOn ?? '',
        takenAt,
        context,
      });
      if (needsConfirmation) setToConfirm(m);
      else save(m);
    } catch (e) {
      if (!isDomainError(e)) throw e;
      setProblem(e.message);
    }
  };

  const unitText = (unit: string) => (
    <Text variant="body" color="secondary" importantForAccessibility="no" accessibilityElementsHidden style={{ paddingBottom: theme.space[4] }}>
      {unit}
    </Text>
  );

  const numberField = (label: string, text: string, onChange: (v: string) => void, testID: string, autoFocus: boolean) => (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.space[2], flex: stacked ? undefined : 1 }}>
      <TextField
        label={label}
        value={text}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        accessibilityLabel={`${label}, em ${unitSpoken}`}
        autoFocus={autoFocus}
        containerStyle={{ flex: 1 }}
        testID={testID}
      />
      {unitText(vital!.unit)}
    </View>
  );

  const saveError = add.error ? errorMessage(add.error, 'Não foi possível salvar a medida. Tente de novo.') : null;

  return (
    <View style={{ gap: theme.layout.fieldGap }}>
      <Select label="Sinal vital" options={KIND_OPTIONS} value={code} onChange={(next) => {
          // Trocar o tipo limpa os números: 82,4 kg não vira 82,4 cm.
          edit(setCode)(next);
          setValue('');
          setValue2('');
          setContext(null);
        }}
        placeholder="Escolher sinal vital" testID="vital-kind" />

      {code === 'bp' ? (
        <View style={{ flexDirection: stacked ? 'column' : 'row', gap: theme.space[4] }}>
          {numberField('Sistólica', value, edit(setValue), 'vital-systolic', !!kind)}
          {numberField('Diastólica', value2, edit(setValue2), 'vital-diastolic', false)}
        </View>
      ) : code ? (
        numberField(VALUE_LABEL[code], value, edit(setValue), 'vital-value', !!kind)
      ) : null}

      {code === 'glucose_capillary' ? (
        <View>
          <FieldLabel label="Momento da medição" optional />
          <ChipGroup options={CONTEXT_OPTIONS} value={context ? [context] : []} onChange={(v) => edit(setContext)(v[0] ?? null)} multiple={false} testID="vital-context" />
        </View>
      ) : null}

      {code ? (
        <View style={{ flexDirection: stacked ? 'column' : 'row', gap: theme.space[4] }}>
          <View style={{ flex: stacked ? undefined : 3 }}>
            <DateField label="Data" value={takenOn} onChange={edit(setTakenOn)} maximumDate={toLocalIsoDate()} testID="vital-date" />
          </View>
          <TextField
            label="Hora"
            value={takenAt}
            onChangeText={edit(setTakenAt)}
            keyboardType="numbers-and-punctuation"
            placeholder="08:30"
            maxLength={5}
            containerStyle={{ flex: stacked ? undefined : 2 }}
            testID="vital-time"
          />
        </View>
      ) : null}

      {member.isError ? (
        <Banner tone="warning" message="Não foi possível carregar os dados da pessoa." action={{ label: 'Tentar de novo', onPress: () => void member.refetch() }} />
      ) : null}
      {problem ? <Banner tone="warning" message={problem} testID="vital-problem" /> : null}
      {saveError ? <Banner tone="warning" message={saveError} /> : null}

      {toConfirm ? (
        <View style={{ gap: theme.space[3] }}>
          <Banner tone="warning" message={improbableValueMessage(toConfirm)} testID="vital-confirm" />
          <Button label="Salvar assim" onPress={() => save(toConfirm)} loading={add.isPending} fullWidth />
          <Button label="Corrigir" variant="bordered" onPress={() => setToConfirm(null)} disabled={add.isPending} fullWidth />
        </View>
      ) : (
        <Button label="Salvar medida" onPress={submit} loading={add.isPending} disabled={!code || !member.data} fullWidth />
      )}

      {member.data ? (
        <Text variant="footnote" color="secondary">
          {vitalsFootnote(member.data.fullName)}
        </Text>
      ) : null}
    </View>
  );
}
