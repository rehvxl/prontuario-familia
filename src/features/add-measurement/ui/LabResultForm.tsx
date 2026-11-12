import { useMemo, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMyFamily } from '@/entities/family';
import { useMemberTimeline } from '@/entities/health-record';
import { ANALYTES, GROUP_TITLES, findAnalyte, type Measurement, type MeasurementChanges } from '@/entities/measurement';
import { formatDecimal, formatShortDate, isDomainError, normalizeSearchText, type DomainError } from '@/shared/lib';
import {
  Banner,
  Button,
  DateField,
  FieldLabel,
  FieldMessage,
  ListItem,
  ListSection,
  SearchField,
  Select,
  TextField,
  errorMessage,
  toISODate,
  useStackedLayout,
  useTheme,
} from '@/shared/ui';
import { validateLabInput } from '../domain/validate';
import { useAddMeasurement, useUpdateMeasurement } from '../model/hooks';

export interface LabResultFormProps {
  memberId: string;
  onSaved(): void;
  /** Edição (F2.9): o exame fica fixo; valor, unidade, faixa do laudo e data podem mudar. */
  measurement?: Measurement;
}

const OTHER = 'other';
const NO_DOCUMENT = 'none';
const MAX_MATCHES = 8;

/** Campo do formulário que recebe cada código de `DomainError` do `validateLabInput`. */
const FIELD_OF: Record<string, 'exam' | 'name' | 'value' | 'unit' | 'range' | 'date'> = {
  'measurement/missing-exam': 'exam',
  'measurement/missing-name': 'name',
  'measurement/name-too-long': 'name',
  'measurement/invalid-value': 'value',
  'measurement/unit-too-long': 'unit',
  'measurement/invalid-reference': 'range',
  'measurement/invalid-range': 'range',
  'measurement/reference-too-long': 'range',
  'measurement/invalid-date': 'date',
  'measurement/future-date': 'date',
};

const decimalText = (n: number | null | undefined) => (n === null || n === undefined ? '' : formatDecimal(n));

/**
 * "Adicionar resultado" (F2.5, F2.6) e edição de um resultado (F2.9). Exame do catálogo com busca ou "Outro"
 * com nome, valor, unidade sugerida e editável, faixa do laudo opcional, data e documento de origem opcional.
 * Valida com `validateLabInput` ao salvar; nada é gravado com erro.
 */
export function LabResultForm({ memberId, onSaved, measurement }: LabResultFormProps): ReactElement {
  const theme = useTheme();
  const stacked = useStackedLayout();
  const editing = !!measurement;
  const family = useMyFamily({ enabled: !editing });
  const familyId = measurement?.familyId ?? family.data?.id;
  const timeline = useMemberTimeline(editing ? undefined : familyId, memberId);
  const add = useAddMeasurement();
  const update = useUpdateMeasurement();

  const today = toISODate(new Date());
  const [code, setCode] = useState<string | null>(measurement?.code ?? null);
  const [query, setQuery] = useState('');
  const [name, setName] = useState(measurement?.label ?? '');
  const [value, setValue] = useState(decimalText(measurement?.value));
  const [unit, setUnit] = useState(measurement?.unit ?? '');
  const [low, setLow] = useState(decimalText(measurement?.referenceLow));
  const [high, setHigh] = useState(decimalText(measurement?.referenceHigh));
  const [referenceText, setReferenceText] = useState(measurement?.referenceText ?? '');
  const [takenOn, setTakenOn] = useState<string | null>(measurement?.takenOn ?? today);
  const [sourceRecordId, setSourceRecordId] = useState<string>(NO_DOCUMENT);
  const [invalid, setInvalid] = useState<DomainError | null>(null);

  const analyte = code && code !== OTHER ? findAnalyte(code) : undefined;
  const matches = useMemo(() => {
    const q = normalizeSearchText(query);
    if (!q) return [];
    return ANALYTES.filter((a) => normalizeSearchText(a.label).includes(q) || a.aliases.some((alias) => alias.includes(q))).slice(0, MAX_MATCHES);
  }, [query]);
  const records = (timeline.data ?? []).flatMap((g) => g.records);
  const documentOptions = [{ value: NO_DOCUMENT, label: 'Nenhum' }, ...records.map((r) => ({ value: r.id, label: `${r.title} · ${formatShortDate(r.date)}` }))];

  const field = invalid ? FIELD_OF[invalid.code] : undefined;
  const errorFor = (key: string) => (field === key ? invalid!.message : undefined);
  const saveError = add.error ?? update.error;
  const bannerError = invalid && !field ? invalid.message : saveError ? errorMessage(saveError, 'Não foi possível salvar. Nada foi gravado.') : null;

  const choose = (next: string) => {
    setCode(next);
    setQuery('');
    const a = findAnalyte(next);
    if (a) setUnit(a.unit);
  };

  const submit = () => {
    if (!familyId) return;
    let input;
    try {
      input = validateLabInput({
        familyId,
        memberId,
        code: code ?? '',
        label: name,
        value,
        unit,
        referenceLow: low,
        referenceHigh: high,
        referenceText,
        takenOn: takenOn ?? '',
        sourceRecordId: measurement ? measurement.sourceRecordId : sourceRecordId === NO_DOCUMENT ? null : sourceRecordId,
      });
    } catch (e) {
      if (!isDomainError(e)) throw e;
      setInvalid(e);
      return;
    }
    setInvalid(null);
    if (measurement) {
      const changes: MeasurementChanges = {
        label: input.label,
        value: input.value,
        unit: input.unit,
        referenceLow: input.referenceLow,
        referenceHigh: input.referenceHigh,
        referenceText: input.referenceText,
        takenOn: input.takenOn,
      };
      update.mutate({ id: measurement.id, changes }, { onSuccess: onSaved });
    } else {
      add.mutate(input, { onSuccess: onSaved });
    }
  };

  const examLabel = code === OTHER ? 'Outro exame' : analyte?.label;
  const pair = stacked ? styles.column : styles.pair;

  return (
    <View style={{ gap: theme.layout.fieldGap }}>
      {bannerError ? <Banner tone="danger" message={bannerError} /> : null}

      <View>
        <FieldLabel label="Exame" />
        {examLabel ? (
          <ListSection separatorInset="none">
            <ListItem
              title={examLabel}
              subtitle={analyte ? [GROUP_TITLES[analyte.group], analyte.unit].filter(Boolean).join(' · ') : 'Digite o nome como está no laudo'}
              meta={editing ? undefined : 'Trocar'}
              onPress={editing ? undefined : () => setCode(null)}
              accessibilityLabel={editing ? `Exame: ${examLabel}` : `Exame: ${examLabel}. Trocar exame`}
              testID="lab-exam-selected"
            />
          </ListSection>
        ) : (
          <View style={{ gap: theme.space[3] }}>
            <SearchField value={query} onChangeText={setQuery} placeholder="Buscar exame" accessibilityLabel="Buscar exame" autoCorrect={false} testID="lab-exam-search" />
            <ListSection separatorInset="none">
              {matches.map((a) => (
                <ListItem key={a.code} title={a.label} subtitle={[GROUP_TITLES[a.group], a.unit].filter(Boolean).join(' · ')} onPress={() => choose(a.code)} testID={`lab-exam-${a.code}`} />
              ))}
              <ListItem title="Outro exame" subtitle="Fora da lista: digite o nome como está no laudo" onPress={() => choose(OTHER)} testID="lab-exam-other" />
            </ListSection>
          </View>
        )}
        <FieldMessage error={errorFor('exam')} helper={examLabel ? undefined : 'Digite parte do nome, por exemplo glicada.'} />
      </View>

      {code === OTHER ? (
        <TextField label="Nome do exame" value={name} onChangeText={setName} disabled={editing} autoCapitalize="sentences" error={errorFor('name')} testID="lab-name" />
      ) : null}

      <View style={[pair, { gap: theme.space[3] }]}>
        <TextField
          label="Valor"
          value={value}
          onChangeText={setValue}
          keyboardType="decimal-pad"
          placeholder="13,2"
          error={errorFor('value')}
          containerStyle={stacked ? undefined : styles.grow}
          testID="lab-value"
        />
        <TextField
          label="Unidade"
          value={unit}
          onChangeText={setUnit}
          autoCapitalize="none"
          autoCorrect={false}
          helper={analyte ? 'Sugerida pelo catálogo' : undefined}
          error={errorFor('unit')}
          containerStyle={stacked ? undefined : styles.grow}
          testID="lab-unit"
        />
      </View>

      <View>
        <FieldLabel label="Faixa do laudo" optional />
        <View style={{ gap: theme.space[3] }}>
          <View style={[pair, { gap: theme.space[3] }]}>
            <TextField label="Mínimo" value={low} onChangeText={setLow} keyboardType="decimal-pad" containerStyle={stacked ? undefined : styles.grow} testID="lab-low" />
            <TextField label="Máximo" value={high} onChangeText={setHigh} keyboardType="decimal-pad" containerStyle={stacked ? undefined : styles.grow} testID="lab-high" />
          </View>
          <TextField label="Faixa em texto" value={referenceText} onChangeText={setReferenceText} placeholder="Desejável: < 190" helper="Como está impressa no laudo" testID="lab-reference-text" />
        </View>
        <FieldMessage error={errorFor('range')} />
      </View>

      <DateField label="Data da coleta" value={takenOn} onChange={setTakenOn} maximumDate={today} error={errorFor('date')} testID="lab-date" />

      {!editing && records.length > 0 ? (
        <Select label="Documento de origem" optional options={documentOptions} value={sourceRecordId} onChange={setSourceRecordId} testID="lab-document" />
      ) : null}

      <Button label={editing ? 'Salvar alterações' : 'Salvar resultado'} onPress={submit} loading={add.isPending || update.isPending} disabled={!familyId} fullWidth testID="lab-save" />
    </View>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { flexDirection: 'column' },
  grow: { flex: 1 },
});
