import { DomainError, collapseSpaces, isValidIsoDate } from '@/shared/lib';
import { medicationEndOn, type NewMedication } from '@/entities/medication';

export type MedicationPlan = { kind: 'continuous' } | { kind: 'until'; endOn: string } | { kind: 'days'; days: number };

const NAME_MAX = 120;
const DOSAGE_MAX = 60;
const INSTRUCTIONS_MAX = 500;
const MIN_DATE = '1900-01-01';

function optional(value: string | undefined, max: number, code: string, label: string): string | null {
  const text = (value ?? '').trim();
  if (text === '') return null;
  if (text.length > max) throw new DomainError(code, `${label} deve ter no máximo ${max} caracteres.`);
  return text;
}

function validDate(value: string, code: string): string {
  const date = value.trim();
  if (!isValidIsoDate(date) || date < MIN_DATE) throw new DomainError(code, 'Informe uma data válida.');
  return date;
}

/** F4.4 e F4.5: data de término válida e igual ou posterior ao início. */
export function validateEndOn(startOn: string, endOn: string): string {
  const date = validDate(endOn, 'medication/invalid-end');
  if (date < startOn) {
    throw new DomainError('medication/end-before-start', 'A data de término precisa ser igual ou posterior ao início.');
  }
  return date;
}

/** F4.3 e F4.5: nome, início e a escolha entre "Uso contínuo", "Até {data}" ou "Por {n} dias" (R6). */
export function buildMedicationInput(input: {
  memberId: string;
  familyId: string;
  name: string;
  dosage?: string;
  instructions?: string;
  startOn: string;
  plan: MedicationPlan;
}): NewMedication {
  if (!input.familyId || !input.memberId) throw new DomainError('medication/missing-member', 'Escolha de quem é este medicamento.');
  const name = collapseSpaces(input.name ?? '');
  if (name === '') throw new DomainError('medication/missing-name', 'Informe o nome do medicamento.');
  if (name.length > NAME_MAX) throw new DomainError('medication/name-too-long', `O nome deve ter no máximo ${NAME_MAX} caracteres.`);
  const startOn = validDate(input.startOn ?? '', 'medication/invalid-start');

  let endOn: string | null;
  const plan = input.plan;
  if (plan?.kind === 'continuous') endOn = null;
  else if (plan?.kind === 'until') endOn = validateEndOn(startOn, plan.endOn ?? '');
  else if (plan?.kind === 'days') {
    const end = medicationEndOn(startOn, { kind: 'days', days: plan.days });
    if (!end) throw new DomainError('medication/invalid-days', 'Informe o número de dias.');
    endOn = end;
  } else throw new DomainError('medication/missing-plan', 'Escolha por quanto tempo.');

  return {
    familyId: input.familyId,
    memberId: input.memberId,
    name,
    dosage: optional(input.dosage, DOSAGE_MAX, 'medication/dosage-too-long', 'A dosagem'),
    instructions: optional(input.instructions, INSTRUCTIONS_MAX, 'medication/instructions-too-long', 'A instrução'),
    startOn,
    endOn,
    sourceRecordId: null,
    origin: 'manual',
  };
}
