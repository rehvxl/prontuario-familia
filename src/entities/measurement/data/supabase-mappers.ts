import type { Measurement, MeasurementChanges, MeasurementContext, MeasurementKind, MeasurementOrigin, NewMeasurement } from '../domain/types';

/** Linha de `measurements` (dados-saude-backend.md §2). `numeric` pode chegar como string; `time` vem como HH:mm:ss. */
export interface MeasurementRow {
  id: string;
  family_id: string;
  member_id: string;
  kind: MeasurementKind;
  code: string;
  label: string;
  value: number | string;
  value2: number | string | null;
  unit: string;
  reference_low: number | string | null;
  reference_high: number | string | null;
  reference_text: string | null;
  taken_on: string;
  taken_at: string | null;
  context: MeasurementContext | null;
  note: string | null;
  source_record_id: string | null;
  origin: MeasurementOrigin;
  created_at: string;
  updated_at: string;
}

export const MEASUREMENT_COLUMNS =
  'id,family_id,member_id,kind,code,label,value,value2,unit,reference_low,reference_high,reference_text,taken_on,taken_at,context,note,source_record_id,origin,created_at,updated_at';

const num = (v: number | string | null): number | null => (v === null ? null : Number(v));

export function mapMeasurement(row: MeasurementRow): Measurement {
  return {
    id: row.id,
    familyId: row.family_id,
    memberId: row.member_id,
    kind: row.kind,
    code: row.code,
    label: row.label,
    value: Number(row.value),
    value2: num(row.value2),
    unit: row.unit,
    referenceLow: num(row.reference_low),
    referenceHigh: num(row.reference_high),
    referenceText: row.reference_text,
    takenOn: row.taken_on,
    takenAt: row.taken_at ? row.taken_at.slice(0, 5) : null,
    context: row.context,
    note: row.note,
    sourceRecordId: row.source_record_id,
    origin: row.origin,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toMeasurementInsert(m: NewMeasurement) {
  return {
    family_id: m.familyId,
    member_id: m.memberId,
    kind: m.kind,
    code: m.code,
    label: m.label,
    value: m.value,
    value2: m.value2,
    unit: m.unit,
    reference_low: m.referenceLow,
    reference_high: m.referenceHigh,
    reference_text: m.referenceText,
    taken_on: m.takenOn,
    taken_at: m.takenAt,
    context: m.context,
    note: m.note,
    source_record_id: m.sourceRecordId,
    origin: m.origin,
  };
}

const UPDATE_COLUMNS: Record<keyof MeasurementChanges, string> = {
  label: 'label',
  value: 'value',
  value2: 'value2',
  unit: 'unit',
  referenceLow: 'reference_low',
  referenceHigh: 'reference_high',
  referenceText: 'reference_text',
  takenOn: 'taken_on',
  takenAt: 'taken_at',
  context: 'context',
  note: 'note',
};

/** Só as colunas com grant de update e só os campos presentes. */
export function toMeasurementUpdate(changes: MeasurementChanges): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(UPDATE_COLUMNS)) {
    const value = changes[key as keyof MeasurementChanges];
    if (value !== undefined) patch[column] = value;
  }
  return patch;
}
