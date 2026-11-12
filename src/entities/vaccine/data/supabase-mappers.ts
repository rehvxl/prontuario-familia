// Colunas exatas de docs/features/dados-saude-backend.md §2 (vaccine_doses e vaccine_rule_dismissals).
import type {
  DismissalReason,
  DoseKey,
  NewVaccineDose,
  NewVaccineRuleDismissal,
  VaccineDose,
  VaccineDoseChanges,
  VaccineRuleDismissal,
} from '../domain/types';

export interface VaccineDoseRow {
  id: string;
  family_id: string;
  member_id: string;
  vaccine_code: string;
  vaccine_name: string | null;
  dose_key: DoseKey;
  dose_label: string;
  applied_on: string | null;
  lot: string | null;
  location: string | null;
  source_record_id: string | null;
  origin: 'ocr' | 'manual';
  created_at: string;
  updated_at: string;
}

export interface VaccineRuleDismissalRow {
  id: string;
  family_id: string;
  member_id: string;
  rule_id: string;
  reason: DismissalReason;
  note: string | null;
  created_at: string;
}

export const DOSE_COLUMNS =
  'id,family_id,member_id,vaccine_code,vaccine_name,dose_key,dose_label,applied_on,lot,location,source_record_id,origin,created_at,updated_at';
export const DISMISSAL_COLUMNS = 'id,family_id,member_id,rule_id,reason,note,created_at';

export const mapDose = (row: VaccineDoseRow): VaccineDose => ({
  id: row.id,
  familyId: row.family_id,
  memberId: row.member_id,
  vaccineCode: row.vaccine_code,
  vaccineName: row.vaccine_name,
  doseKey: row.dose_key,
  doseLabel: row.dose_label,
  appliedOn: row.applied_on,
  lot: row.lot,
  location: row.location,
  sourceRecordId: row.source_record_id,
  origin: row.origin,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toDoseInsert = (input: NewVaccineDose) => ({
  family_id: input.familyId,
  member_id: input.memberId,
  vaccine_code: input.vaccineCode,
  vaccine_name: input.vaccineName,
  dose_key: input.doseKey,
  dose_label: input.doseLabel,
  applied_on: input.appliedOn,
  lot: input.lot,
  location: input.location,
  source_record_id: input.sourceRecordId,
  origin: input.origin,
});

const UPDATE_COLUMNS: [keyof VaccineDoseChanges, string][] = [
  ['vaccineCode', 'vaccine_code'],
  ['vaccineName', 'vaccine_name'],
  ['doseKey', 'dose_key'],
  ['doseLabel', 'dose_label'],
  ['appliedOn', 'applied_on'],
  ['lot', 'lot'],
  ['location', 'location'],
];

/** Só as chaves informadas (PATCH parcial). */
export function toDoseUpdate(changes: VaccineDoseChanges): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [key, column] of UPDATE_COLUMNS) if (changes[key] !== undefined) patch[column] = changes[key];
  return patch;
}

export const mapDismissal = (row: VaccineRuleDismissalRow): VaccineRuleDismissal => ({
  id: row.id,
  familyId: row.family_id,
  memberId: row.member_id,
  ruleId: row.rule_id,
  reason: row.reason,
  note: row.note,
  createdAt: row.created_at,
});

export const toDismissalInsert = (input: NewVaccineRuleDismissal) => ({
  family_id: input.familyId,
  member_id: input.memberId,
  rule_id: input.ruleId,
  reason: input.reason,
  note: input.note,
});
