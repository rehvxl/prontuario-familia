import { DomainError, collapseSpaces, isValidIsoDate, toLocalIsoDate } from '@/shared/lib';
import {
  DOSE_KEYS,
  VACCINE_SCHEDULE,
  doseLabelOf,
  isCatalogVaccineCode,
  type DismissalReason,
  type NewVaccineDose,
  type NewVaccineRuleDismissal,
} from '@/entities/vaccine';

// Limites das colunas de dados-saude-backend.md §2.
const NAME_MAX = 120;
const DOSE_LABEL_MAX = 40;
const LOT_MAX = 40;
const LOCATION_MAX = 200;
const NOTE_MAX = 140;
const MIN_DATE = '1900-01-01';
const REASONS: readonly DismissalReason[] = ['had_disease', 'professional_advice', 'other'];

type Fields = Record<string, unknown>;

const fields = (input: unknown): Fields => (typeof input === 'object' && input !== null ? (input as Fields) : {});

function requiredId(value: unknown, code: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new DomainError(code, 'Escolha a pessoa.');
  return value;
}

/** Texto opcional: vazio vira null; acima do limite, erro com a mensagem dada. */
function optionalText(value: unknown, max: number, code: string, message: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new DomainError(code, message);
  const text = collapseSpaces(value);
  if (text.length > max) throw new DomainError(code, message);
  return text || null;
}

function appliedOn(value: unknown, today: string): string | null {
  if (value === null || value === undefined || value === '') return null; // "Não sei a data"
  if (typeof value !== 'string' || !isValidIsoDate(value.trim()) || value.trim() < MIN_DATE) {
    throw new DomainError('vaccine/invalid-date', 'Data inválida.');
  }
  if (value.trim() > today) throw new DomainError('vaccine/future-date', 'A data não pode estar no futuro.');
  return value.trim();
}

/** F3.5: vacina (catálogo ou "Outra" com nome), dose, data ou "Não sei a data", lote e local opcionais. */
export function validateDoseInput(input: unknown, today: string = toLocalIsoDate()): NewVaccineDose {
  const f = fields(input);
  const vaccineCode = typeof f.vaccineCode === 'string' ? f.vaccineCode : '';
  if (vaccineCode !== 'other' && !isCatalogVaccineCode(vaccineCode)) {
    throw new DomainError('vaccine/invalid-code', 'Escolha a vacina.');
  }
  const vaccineName =
    vaccineCode === 'other'
      ? optionalText(f.vaccineName, NAME_MAX, 'vaccine/invalid-name', `O nome da vacina deve ter até ${NAME_MAX} caracteres.`)
      : null;
  if (vaccineCode === 'other' && !vaccineName) throw new DomainError('vaccine/missing-name', 'Digite o nome da vacina.');

  const doseKey = DOSE_KEYS.find((k) => k === f.doseKey);
  if (!doseKey) throw new DomainError('vaccine/invalid-dose-key', 'Escolha a dose.');
  const doseLabel =
    optionalText(f.doseLabel, DOSE_LABEL_MAX, 'vaccine/invalid-dose-label', `O nome da dose deve ter até ${DOSE_LABEL_MAX} caracteres.`) ??
    doseLabelOf(doseKey);

  return {
    familyId: requiredId(f.familyId, 'vaccine/missing-family'),
    memberId: requiredId(f.memberId, 'vaccine/missing-member'),
    vaccineCode,
    vaccineName,
    doseKey,
    doseLabel,
    appliedOn: appliedOn(f.appliedOn, today),
    lot: optionalText(f.lot, LOT_MAX, 'vaccine/invalid-lot', `O lote deve ter até ${LOT_MAX} caracteres.`),
    location: optionalText(f.location, LOCATION_MAX, 'vaccine/invalid-location', `O local deve ter até ${LOCATION_MAX} caracteres.`),
    sourceRecordId: typeof f.sourceRecordId === 'string' && f.sourceRecordId ? f.sourceRecordId : null,
    origin: f.origin === 'ocr' ? 'ocr' : 'manual',
  };
}

/** F3.7: "Não se aplica" com motivo, só para regras do calendário. */
export function validateDismissalInput(input: unknown): NewVaccineRuleDismissal {
  const f = fields(input);
  if (!VACCINE_SCHEDULE.some((r) => r.automatic && r.id === f.ruleId)) {
    throw new DomainError('vaccine/invalid-rule', 'Indicação do calendário não encontrada.');
  }
  const reason = REASONS.find((r) => r === f.reason);
  if (!reason) throw new DomainError('vaccine/invalid-reason', 'Escolha o motivo.');
  return {
    familyId: requiredId(f.familyId, 'vaccine/missing-family'),
    memberId: requiredId(f.memberId, 'vaccine/missing-member'),
    ruleId: f.ruleId as string,
    reason,
    note: optionalText(f.note, NOTE_MAX, 'vaccine/invalid-note', `A observação deve ter até ${NOTE_MAX} caracteres.`),
  };
}
