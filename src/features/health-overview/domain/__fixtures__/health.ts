// Dados fictícios dos testes do health-overview (hoje = 11/11/2026).
import type { Measurement } from '@/entities/measurement';
import type { Medication } from '@/entities/medication';
import type { Member } from '@/entities/member';
import type { VaccineDose } from '@/entities/vaccine';

export const TODAY = '2026-11-11';

export const member = (id: string, fullName: string, birthDate: string | null): Member => ({
  id,
  familyId: 'f1',
  fullName,
  birthDate,
  relationship: 'self',
  sex: 'unspecified',
  createdAt: `2026-01-01T00:00:0${id.length}Z`,
});

let seq = 0;
export const lab = (memberId: string, over: Partial<Measurement> = {}): Measurement => ({
  id: `x${(seq += 1)}`,
  familyId: 'f1',
  memberId,
  kind: 'lab',
  code: 'hba1c',
  label: 'Hemoglobina glicada',
  value: 5,
  value2: null,
  unit: '%',
  referenceLow: 4,
  referenceHigh: 5.6,
  referenceText: null,
  takenOn: '2026-10-12',
  takenAt: null,
  context: null,
  note: null,
  sourceRecordId: null,
  origin: 'ocr',
  createdAt: '2026-10-12T10:00:00Z',
  updatedAt: '2026-10-12T10:00:00Z',
  ...over,
});

export const vital = (memberId: string, over: Partial<Measurement>): Measurement =>
  lab(memberId, { kind: 'vital', origin: 'manual', referenceLow: null, referenceHigh: null, ...over });

export const dose = (memberId: string, vaccineCode: string, appliedOn: string | null): VaccineDose => ({
  id: `d${(seq += 1)}`,
  familyId: 'f1',
  memberId,
  vaccineCode,
  vaccineName: null,
  doseKey: 'D1',
  doseLabel: '1ª dose',
  appliedOn,
  lot: null,
  location: null,
  sourceRecordId: null,
  origin: 'manual',
  createdAt: 'c',
  updatedAt: 'c',
});

export const medication = (memberId: string, over: Partial<Medication> = {}): Medication => ({
  id: `med${(seq += 1)}`,
  familyId: 'f1',
  memberId,
  name: 'Losartana',
  dosage: '50 mg',
  instructions: null,
  startOn: '2026-01-01',
  endOn: null,
  sourceRecordId: null,
  origin: 'manual',
  createdAt: 'c',
  updatedAt: 'c',
  ...over,
});

/** Adulto de 30 anos com o esquema "conforme histórico" completo e o reforço de dT até 2030: em dia (R14). */
export const UP_TO_DATE_DOSES = (memberId: string): VaccineDose[] => [
  dose(memberId, 'hepatitis_b', null),
  dose(memberId, 'hepatitis_b', null),
  dose(memberId, 'hepatitis_b', null),
  dose(memberId, 'dt', null),
  dose(memberId, 'dt', null),
  dose(memberId, 'dt', '2020-01-01'),
  dose(memberId, 'mmr', null),
  dose(memberId, 'yellow_fever', '2015-03-01'),
];
