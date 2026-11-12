// Itens da revisão do OCR (spec F1, ocr-tecnico.md §f): todos começam desmarcados (S4, F1.4).
// A conversão sugestão → entrada fica aqui porque feature não importa feature (o add-record só recebe o resultado).
import type { HealthDataInput } from '@/features/add-record';
import { validateLabInput } from '@/features/add-measurement';
import { buildMedicationInput, type MedicationPlan } from '@/features/manage-medication';
import type { HealthDocumentSuggestions, LabResultSuggestion, MedicationSuggestion, VaccineSuggestion } from '@/features/read-document';
import { validateDoseInput } from '@/features/record-vaccine-dose';
import { formatMeasurementValue } from '@/entities/measurement';
import { DomainError, isDomainError } from '@/shared/lib';

export type ReviewGroup = 'lab' | 'vaccine' | 'medication';

export type ReviewItem =
  /** `value`/`unit` em texto pt-BR, editáveis: a linha "Confira" (F1.8) chega vazia. */
  | { id: string; group: 'lab'; selected: boolean; suggestion: LabResultSuggestion; value: string; unit: string }
  | { id: string; group: 'vaccine'; selected: boolean; suggestion: VaccineSuggestion }
  /** `plan` null = duração não lida: a pessoa escolhe antes de salvar (R6). */
  | { id: string; group: 'medication'; selected: boolean; suggestion: MedicationSuggestion; plan: MedicationPlan | null };

function planOf(duration: MedicationSuggestion['duration']): MedicationPlan | null {
  if (duration.kind === 'continuous') return { kind: 'continuous' };
  if (duration.kind === 'days') return { kind: 'days', days: duration.days };
  return null;
}

/** Valor lido em texto pt-BR, com as casas do analito ("1,0" para creatinina 1). '' quando não foi lido (F1.8). */
export const suggestedLabValue = (s: LabResultSuggestion) =>
  s.value === null ? '' : formatMeasurementValue({ code: s.code, value: s.value, unit: s.unit ?? '' });

/** Sugestões do parser → linhas da revisão, todas desmarcadas. */
export function createReviewItems(s: Pick<HealthDocumentSuggestions, 'labResults' | 'vaccines' | 'medications'>): ReviewItem[] {
  return [
    ...s.labResults.map((suggestion, i): ReviewItem => ({
      id: `lab-${i}`,
      group: 'lab',
      selected: false,
      suggestion,
      value: suggestedLabValue(suggestion),
      unit: suggestion.unit ?? '',
    })),
    ...s.vaccines.map((suggestion, i): ReviewItem => ({ id: `vaccine-${i}`, group: 'vaccine', selected: false, suggestion })),
    ...s.medications.map((suggestion, i): ReviewItem => ({
      id: `medication-${i}`,
      group: 'medication',
      selected: false,
      suggestion,
      plan: planOf(suggestion.duration),
    })),
  ];
}

export const countSelected = (items: readonly ReviewItem[]) => items.filter((i) => i.selected).length;

export interface HealthDataContext {
  familyId: string;
  memberId: string;
  /** Data do registro: vira `takenOn` dos exames e o início padrão dos medicamentos. */
  recordDate: string;
  today: string;
}

const messageOf = (error: unknown) => (isDomainError(error) ? error.message : 'Confira este item.');

/**
 * Só os itens marcados viram entrada de `useAddRecord` (S4). Cada item passa pelo validador da sua feature;
 * o que não passar volta em `errors` (id → mensagem) e nada é salvo até a pessoa corrigir ou desmarcar.
 */
export function toHealthData(items: readonly ReviewItem[], ctx: HealthDataContext): { data: HealthDataInput; errors: Record<string, string> } {
  const data: HealthDataInput = { measurements: [], vaccineDoses: [], medications: [] };
  const errors: Record<string, string> = {};
  const owner = { familyId: ctx.familyId, memberId: ctx.memberId };
  for (const item of items) {
    if (!item.selected) continue;
    try {
      if (item.group === 'lab') {
        const s = item.suggestion;
        data.measurements.push(
          validateLabInput({
            ...owner,
            code: s.code,
            label: s.label,
            value: item.value,
            unit: item.unit,
            referenceLow: s.referenceLow,
            referenceHigh: s.referenceHigh,
            referenceText: s.referenceText,
            takenOn: ctx.recordDate,
          }),
        );
      } else if (item.group === 'vaccine') {
        const s = item.suggestion;
        data.vaccineDoses.push(
          validateDoseInput(
            {
              ...owner,
              vaccineCode: s.vaccineCode,
              vaccineName: s.name,
              // Dose não lida: "Outra dose" (a pessoa ajusta depois na carteira).
              doseKey: s.doseKey ?? 'OUTRA',
              doseLabel: s.doseLabel,
              appliedOn: s.appliedOn,
              lot: s.lot,
              location: s.location,
            },
            ctx.today,
          ),
        );
      } else {
        const s = item.suggestion;
        if (!item.plan) throw new DomainError('medication/missing-plan', 'Escolha por quanto tempo.');
        data.medications.push(
          buildMedicationInput({
            ...owner,
            name: s.name,
            dosage: s.dosage ?? undefined,
            instructions: s.instructions ?? undefined,
            startOn: s.startOn ?? ctx.recordDate,
            plan: item.plan,
          }),
        );
      }
    } catch (error) {
      errors[item.id] = messageOf(error);
    }
  }
  return { data, errors };
}
