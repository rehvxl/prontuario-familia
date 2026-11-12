import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { referenceRangeText, spokenUnit } from '@/entities/measurement';
import { medicationEndOn } from '@/entities/medication';
import { formatShortDate } from '@/shared/lib';
import {
  DateField,
  FieldMessage,
  Icon,
  IconButton,
  ListSection,
  MetricValue,
  SectionHeader,
  Select,
  StateChip,
  Text,
  TextField,
  metricAccessibilityLabel,
  quoteEvidence,
  selectionFeedback,
  useTheme,
} from '@/shared/ui';
import { suggestedLabValue, type ReviewGroup, type ReviewItem } from '../lib/review-items';
import { CONFIDENCE_TEXT } from './SuggestionNote';

export interface FoundItemsProps {
  items: readonly ReviewItem[];
  onChange: (items: ReviewItem[]) => void;
  /** id do item → mensagem (vinda de `toHealthData`). */
  errors?: Readonly<Record<string, string>>;
  /** Data do registro: início padrão dos medicamentos e limite da data "Até". */
  recordDate: string | null;
  disabled?: boolean;
}

/** Estado do laudo só enquanto o valor é o lido; valor editado perde o estado (o app não recalcula a faixa lida). */
const labFlag = (item: Extract<ReviewItem, { group: 'lab' }>) =>
  item.suggestion.value !== null && item.value === suggestedLabValue(item.suggestion) ? item.suggestion.flag : undefined;

const GROUP_TITLE: Record<ReviewGroup, string> = { lab: 'Exames', vaccine: 'Vacinas', medication: 'Medicamentos' };
const GROUPS: ReviewGroup[] = ['lab', 'vaccine', 'medication'];
const PLAN_OPTIONS = [
  { value: 'continuous' as const, label: 'Uso contínuo' },
  { value: 'until' as const, label: 'Até uma data' },
];

/** Texto da linha (o que se vê e o que o leitor de tela ouve, antes do estado da caixa). */
function describe(item: ReviewItem, recordDate: string | null): { title: string; lines: string[]; spoken: string } {
  if (item.group === 'lab') {
    const s = item.suggestion;
    // Faixa do valor lido; a pessoa que muda a unidade não ganha a faixa em outra unidade.
    const range = item.unit === (s.unit ?? '') ? referenceRangeText({ ...s, unit: item.unit }) : s.referenceText;
    const reference = range ? `Faixa do laudo: ${range}` : null;
    // Singular ("1,0 miligrama por decilitro") só para o valor lido; o editado à mão fica no plural.
    const read = item.value === suggestedLabValue(s) ? (s.value ?? undefined) : undefined;
    const value = item.value
      ? metricAccessibilityLabel({ value: item.value, unit: item.unit, unitSpoken: spokenUnit(item.unit, read), state: labFlag(item) })
      : 'confira, sem valor lido';
    return { title: s.label, lines: reference ? [reference] : [], spoken: [s.label, value, reference].filter(Boolean).join(', ') };
  }
  if (item.group === 'vaccine') {
    const s = item.suggestion;
    const line = [s.doseLabel, s.appliedOn ? formatShortDate(s.appliedOn) : 'Data não informada', s.lot ? `Lote ${s.lot}` : null]
      .filter(Boolean)
      .join(' · ');
    return { title: s.name, lines: [line], spoken: `${s.name}, ${line}` };
  }
  const s = item.suggestion;
  const title = [s.name, s.dosage].filter(Boolean).join(' ');
  const start = s.startOn ?? recordDate;
  const end = start ? medicationEndOn(start, s.duration) : undefined;
  const plan = s.duration.kind === 'continuous' ? 'Uso contínuo' : end ? `Até ${formatShortDate(end)}` : 'Duração não lida';
  const lines = [s.instructions, plan].filter((l): l is string => !!l);
  return { title, lines, spoken: [title, ...lines].join(', ') };
}

function ItemRow({
  item,
  onChange,
  error,
  recordDate,
  disabled,
}: {
  item: ReviewItem;
  onChange: (item: ReviewItem) => void;
  error?: string;
  recordDate: string | null;
  disabled: boolean;
}) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const { title, lines, spoken } = describe(item, recordDate);
  const confidence = CONFIDENCE_TEXT[item.suggestion.confidence];
  const low = item.suggestion.confidence === 'low';
  const lab = item.group === 'lab' ? item : null;
  const needsValue = lab !== null && lab.suggestion.value === null;
  const flag = lab ? labFlag(lab) : undefined;
  const toggle = () => {
    selectionFeedback();
    onChange({ ...item, selected: !item.selected });
  };

  return (
    // v4: a linha é um fio da folha (sem cartão), alinhada à coluna de texto.
    <View style={{ paddingVertical: theme.space[3], gap: theme.space[2] }} testID={`found-${item.id}`}>
      <View style={[styles.row, { gap: theme.space[2] }]}>
        <Pressable
          onPress={toggle}
          disabled={disabled}
          accessibilityRole="checkbox"
          role="checkbox"
          accessibilityLabel={spoken}
          accessibilityHint={error ? `Erro: ${error}` : undefined}
          // Sempre booleano, como no `Checkbox` (A8): o leitor de tela anuncia "marcado"/"não marcado".
          accessibilityState={{ checked: item.selected === true, disabled }}
          testID={`found-${item.id}-toggle`}
          style={({ pressed }) => [styles.row, styles.flex, { gap: theme.space[3], minHeight: theme.minTouchTarget }, pressed && { opacity: 0.7 }]}
        >
          <View
            style={[
              styles.box,
              {
                borderRadius: Platform.OS === 'ios' ? 12 : 4,
                borderColor: item.selected ? theme.colors.primary : theme.colors.borderStrong,
                backgroundColor: item.selected ? theme.colors.primary : theme.colors.surface,
              },
            ]}
          >
            {item.selected ? <Icon name="check" size={16} weight="bold" color="onPrimary" /> : null}
          </View>
          {/* Nome na 1ª linha; valor e unidade na 2ª; faixa; estado e confiança; trecho lido (C5). */}
          <View style={[styles.flex, { gap: theme.space[1] }]}>
            <Text variant="headline">{title}</Text>
            {lab && lab.value ? (
              <MetricValue value={lab.value} unit={lab.unit} unitSpoken={spokenUnit(lab.unit)} size="compact" testID={`found-${item.id}-value`} />
            ) : null}
            {lines.map((line) => (
              <Text key={line} variant="subheadline" color="secondary">
                {line}
              </Text>
            ))}
            <View style={[styles.wrap, { gap: theme.space[2] }]}>
              {needsValue ? (
                <Text variant="footnote" color="clinicalHigh" style={styles.strong}>
                  Confira
                </Text>
              ) : flag ? (
                <StateChip state={flag} />
              ) : null}
              {needsValue ? null : (
                <Text variant="footnote" color={low ? 'clinicalHigh' : 'secondary'}>
                  {confidence.text}
                </Text>
              )}
            </View>
            {item.suggestion.evidence ? (
              <Text variant="footnote" color="secondary" testID={`found-${item.id}-evidence`}>
                {quoteEvidence(item.suggestion.evidence)}
              </Text>
            ) : null}
          </View>
        </Pressable>
        {lab ? (
          <IconButton
            icon="edit"
            color="primary"
            iconSize={20}
            accessibilityLabel={`Editar ${title}`}
            onPress={() => setEditing((e) => !e)}
            disabled={disabled}
          />
        ) : null}
      </View>
      {lab && (editing || (lab.selected && needsValue)) ? (
        <View style={[styles.wrap, { gap: theme.space[3], paddingLeft: 24 + theme.space[3] }]}>
          <TextField
            label="Valor"
            value={lab.value}
            onChangeText={(value) => onChange({ ...lab, value })}
            keyboardType="decimal-pad"
            placeholder="Ex.: 13,2"
            disabled={disabled}
            containerStyle={styles.field}
          />
          <TextField
            label="Unidade"
            value={lab.unit}
            onChangeText={(unit) => onChange({ ...lab, unit })}
            optional
            disabled={disabled}
            containerStyle={styles.field}
          />
        </View>
      ) : null}
      {item.group === 'medication' && item.selected && item.suggestion.duration.kind === 'unknown' ? (
        <View style={{ gap: theme.space[3], paddingLeft: 24 + theme.space[3] }}>
          <Select
            label="Por quanto tempo"
            options={PLAN_OPTIONS}
            value={item.plan?.kind === 'continuous' || item.plan?.kind === 'until' ? item.plan.kind : null}
            onChange={(kind) =>
              onChange({ ...item, plan: kind === 'continuous' ? { kind } : { kind, endOn: item.plan?.kind === 'until' ? item.plan.endOn : '' } })
            }
            placeholder="Escolher"
            disabled={disabled}
          />
          {item.plan?.kind === 'until' ? (
            <DateField
              label="Até"
              value={item.plan.endOn || null}
              onChange={(endOn) => onChange({ ...item, plan: { kind: 'until', endOn: endOn ?? '' } })}
              minimumDate={item.suggestion.startOn ?? recordDate ?? undefined}
              disabled={disabled}
            />
          ) : null}
        </View>
      ) : null}
      {error ? (
        <View style={{ paddingLeft: 24 + theme.space[3] }}>
          <FieldMessage error={error} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * "Encontramos no documento": grupos Exames, Vacinas e Medicamentos, cada um com "Selecionar todos".
 * Toda linha começa desmarcada (S4); só o que a pessoa marcar vai para `toHealthData`.
 */
export function FoundItems({ items, onChange, errors = {}, recordDate, disabled = false }: FoundItemsProps) {
  const update = (next: ReviewItem) => onChange(items.map((i) => (i.id === next.id ? next : i)));
  return (
    <View>
      {GROUPS.map((group) => {
        const rows = items.filter((i) => i.group === group);
        if (rows.length === 0) return null;
        const allSelected = rows.every((i) => i.selected);
        return (
          <View key={group} testID={`found-group-${group}`}>
            <SectionHeader
              level="month"
              title={`${GROUP_TITLE[group]} (${rows.length})`}
              action={
                allSelected || disabled
                  ? undefined
                  : {
                      label: 'Selecionar todos',
                      accessibilityHint: `Marca os ${rows.length} itens de ${GROUP_TITLE[group].toLocaleLowerCase('pt-BR')}`,
                      onPress: () => onChange(items.map((i) => (i.group === group ? { ...i, selected: true } : i))),
                    }
              }
            />
            <ListSection separatorInset="none">
              {rows.map((item) => (
                <ItemRow key={item.id} item={item} onChange={update} error={errors[item.id]} recordDate={recordDate} disabled={disabled} />
              ))}
            </ListSection>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  flex: { flex: 1 },
  strong: { fontWeight: '600' },
  box: { width: 24, height: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  field: { flexGrow: 1, flexBasis: 140 },
});
