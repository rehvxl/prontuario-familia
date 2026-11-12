import { DomainError, collapseSpaces, isValidIsoDate, toLocalIsoDate } from '@/shared/lib';
import { VITALS, findAnalyte, type MeasurementContext, type NewMeasurement, type VitalCode } from '@/entities/measurement';

/** Formulário "Adicionar resultado" (F2.5). Números podem vir como texto pt-BR ("13,2"). */
export interface LabInput {
  familyId: string;
  memberId: string;
  /** Código do catálogo ou 'other'. */
  code: string;
  /** Obrigatório em 'other'; no catálogo vale o rótulo do catálogo. */
  label?: string | null;
  value: string | number;
  /** Sugerida pelo catálogo e editável; vazio = unidade do catálogo. */
  unit?: string | null;
  referenceLow?: string | number | null;
  referenceHigh?: string | number | null;
  referenceText?: string | null;
  takenOn: string;
  sourceRecordId?: string | null;
  note?: string | null;
}

/** Formulário "Registrar sinal vital" (F5.1). */
export interface VitalInput {
  familyId: string;
  memberId: string;
  code: VitalCode;
  /** Sistólica em 'bp'. */
  value: string | number;
  /** Diastólica; só em 'bp'. */
  value2?: string | number | null;
  takenOn: string;
  /** HH:mm */
  takenAt?: string | null;
  /** Só em 'glucose_capillary'. */
  context?: MeasurementContext | null;
  note?: string | null;
}

export const MEASUREMENT_NOTE_MAX = 140;
const LABEL_MAX = 120;
const UNIT_MAX = 30;
const REFERENCE_TEXT_MAX = 200;
const MIN_DATE = '1900-01-01';
const MAX_ABS_VALUE = 1_000_000_000;
const CONTEXTS: MeasurementContext[] = ['fasting', 'post_meal', 'other'];

/** F5.3: limites de digitação (inclusivos). Existem só para pegar erro de digitação, nunca para avaliar o valor. */
export const VITAL_TYPING_LIMITS = {
  bpSystolic: [50, 300],
  bpDiastolic: [30, 200],
  glucose_capillary: [10, 800],
  weight: [0.5, 400],
  height: [30, 250],
} as const satisfies Record<string, readonly [number, number]>;

const INVALID_NUMBER = 'Digite um número, por exemplo 13,2.';

/**
 * Número digitado em pt-BR: vírgula é decimal e ponto é milhar ("1.234,5", "250.000").
 * Sem vírgula, ponto seguido de grupos de 3 dígitos é milhar; senão é decimal ("7.4").
 */
export function parseDecimal(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;
  const text = raw.trim().replace(/\s/g, '');
  if (text === '') return null;
  let normalized: string;
  if (text.includes(',')) normalized = text.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) normalized = text.replace(/\./g, '');
  else normalized = text;
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

type Fields = Record<string, unknown>;
const fieldsOf = (input: unknown): Fields => (input && typeof input === 'object' ? (input as Fields) : {});
const text = (v: unknown): string => (typeof v === 'string' ? v : '');

function positive(raw: unknown, code = 'measurement/invalid-value'): number {
  const value = parseDecimal(raw);
  if (value === null || value <= 0 || value >= MAX_ABS_VALUE) throw new DomainError(code, INVALID_NUMBER);
  return value;
}

function optionalNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '')) return null;
  const value = parseDecimal(raw);
  if (value === null || Math.abs(value) >= MAX_ABS_VALUE) throw new DomainError('measurement/invalid-reference', INVALID_NUMBER);
  return value;
}

function optionalText(raw: unknown, max: number, code: string, label: string): string | null {
  const value = text(raw).trim();
  if (value === '') return null;
  if (value.length > max) throw new DomainError(code, `${label} deve ter no máximo ${max} caracteres.`);
  return value;
}

function owner(f: Fields): { familyId: string; memberId: string } {
  const familyId = text(f.familyId);
  const memberId = text(f.memberId);
  if (!familyId || !memberId) throw new DomainError('measurement/missing-member', 'Escolha de quem é esta medição.');
  return { familyId, memberId };
}

function takenOnOf(raw: unknown, now: Date): string {
  const date = text(raw).trim();
  if (!isValidIsoDate(date) || date < MIN_DATE) throw new DomainError('measurement/invalid-date', 'Informe uma data válida.');
  if (date > toLocalIsoDate(now)) throw new DomainError('measurement/future-date', 'A data não pode estar no futuro.');
  return date;
}

function takenAtOf(raw: unknown): string | null {
  const time = text(raw).trim();
  if (time === '') return null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new DomainError('measurement/invalid-time', 'Informe uma hora válida.');
  return time;
}

const noteOf = (raw: unknown) => optionalText(raw, MEASUREMENT_NOTE_MAX, 'measurement/note-too-long', 'A observação');

/** F2.5 e F2.6: valida o resultado de exame digitado. Lança `DomainError`; não salva nada. */
export function validateLabInput(input: unknown, now: Date = new Date()): NewMeasurement {
  const f = fieldsOf(input);
  const { familyId, memberId } = owner(f);
  const code = text(f.code).trim();
  const analyte = code === 'other' ? undefined : findAnalyte(code);
  if (code !== 'other' && !analyte) throw new DomainError('measurement/missing-exam', 'Escolha o exame.');
  const label = analyte ? analyte.label : collapseSpaces(text(f.label));
  if (label === '') throw new DomainError('measurement/missing-name', 'Informe o nome do exame.');
  if (label.length > LABEL_MAX) throw new DomainError('measurement/name-too-long', `O nome do exame deve ter no máximo ${LABEL_MAX} caracteres.`);

  const value = positive(f.value);
  const unit = optionalText(f.unit, UNIT_MAX, 'measurement/unit-too-long', 'A unidade') ?? analyte?.unit ?? '';
  const referenceLow = optionalNumber(f.referenceLow);
  const referenceHigh = optionalNumber(f.referenceHigh);
  if (referenceLow !== null && referenceHigh !== null && referenceLow > referenceHigh) {
    throw new DomainError('measurement/invalid-range', 'O mínimo da faixa precisa ser menor ou igual ao máximo.');
  }

  return {
    familyId,
    memberId,
    kind: 'lab',
    code,
    label,
    value,
    value2: null,
    unit,
    referenceLow,
    referenceHigh,
    referenceText: optionalText(f.referenceText, REFERENCE_TEXT_MAX, 'measurement/reference-too-long', 'A faixa do laudo'),
    takenOn: takenOnOf(f.takenOn, now),
    takenAt: null,
    context: null,
    note: noteOf(f.note),
    sourceRecordId: text(f.sourceRecordId) || null,
    origin: 'manual',
  };
}

const outside = (value: number, [min, max]: readonly [number, number]) => value < min || value > max;

/**
 * F5.1–F5.3: valida o sinal vital digitado. Sistólica ≤ diastólica bloqueia (F5.2).
 * Fora dos limites de digitação → `needsConfirmation` (a tela mostra A14 com "Salvar assim" / "Corrigir").
 */
export function validateVitalInput(input: unknown, now: Date = new Date()): { value: NewMeasurement; needsConfirmation: boolean } {
  const f = fieldsOf(input);
  const { familyId, memberId } = owner(f);
  const vital = VITALS.find((v) => v.code === f.code);
  if (!vital) throw new DomainError('measurement/missing-vital', 'Escolha o sinal vital.');

  let value = positive(f.value);
  let value2: number | null = null;
  let needsConfirmation: boolean;
  if (vital.code === 'bp') {
    value2 = positive(f.value2);
    if (value <= value2) {
      throw new DomainError(
        'measurement/bp-order',
        'A primeira pressão (sistólica) costuma ser maior que a segunda (diastólica). Confira os números.',
      );
    }
    needsConfirmation = outside(value, VITAL_TYPING_LIMITS.bpSystolic) || outside(value2, VITAL_TYPING_LIMITS.bpDiastolic);
  } else {
    if (vital.code === 'weight') value = positive(Math.round(value * 10) / 10); // F5.1: peso com 1 casa decimal
    needsConfirmation = outside(value, VITAL_TYPING_LIMITS[vital.code]);
  }

  const context = vital.code === 'glucose_capillary' && CONTEXTS.includes(f.context as MeasurementContext) ? (f.context as MeasurementContext) : null;

  return {
    value: {
      familyId,
      memberId,
      kind: 'vital',
      code: vital.code,
      label: vital.label,
      value,
      value2,
      unit: vital.unit,
      referenceLow: null,
      referenceHigh: null,
      referenceText: null,
      takenOn: takenOnOf(f.takenOn, now),
      takenAt: takenAtOf(f.takenAt),
      context,
      note: noteOf(f.note),
      sourceRecordId: null,
      origin: 'manual',
    },
    needsConfirmation,
  };
}
