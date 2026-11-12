import type { Medication, MedicationChanges, NewMedication } from '../domain/types';

/** Linha de `medications` (dados-saude-backend.md §2). */
export interface MedicationRow {
  id: string;
  family_id: string;
  member_id: string;
  name: string;
  dosage: string | null;
  instructions: string | null;
  start_on: string;
  end_on: string | null;
  source_record_id: string | null;
  origin: 'ocr' | 'manual';
  created_at: string;
  updated_at: string;
}

export const MEDICATION_COLUMNS = 'id,family_id,member_id,name,dosage,instructions,start_on,end_on,source_record_id,origin,created_at,updated_at';

export function mapMedication(row: MedicationRow): Medication {
  return {
    id: row.id,
    familyId: row.family_id,
    memberId: row.member_id,
    name: row.name,
    dosage: row.dosage,
    instructions: row.instructions,
    startOn: row.start_on,
    endOn: row.end_on,
    sourceRecordId: row.source_record_id,
    origin: row.origin,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toMedicationInsert(m: NewMedication) {
  return {
    family_id: m.familyId,
    member_id: m.memberId,
    name: m.name,
    dosage: m.dosage,
    instructions: m.instructions,
    start_on: m.startOn,
    end_on: m.endOn,
    source_record_id: m.sourceRecordId,
    origin: m.origin,
  };
}

const UPDATE_COLUMNS: Record<keyof MedicationChanges, string> = {
  name: 'name',
  dosage: 'dosage',
  instructions: 'instructions',
  startOn: 'start_on',
  endOn: 'end_on',
};

/** Só as colunas com grant de update e só os campos presentes. */
export function toMedicationUpdate(changes: MedicationChanges): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(UPDATE_COLUMNS)) {
    const value = changes[key as keyof MedicationChanges];
    if (value !== undefined) patch[column] = value;
  }
  return patch;
}
