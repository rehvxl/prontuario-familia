// Contrato congelado na F0 (docs/features/v0.2-plano-implementacao.md §3.3).

export interface Medication {
  id: string;
  familyId: string;
  memberId: string;
  name: string;
  dosage: string | null;
  instructions: string | null;
  startOn: string;
  /** null = uso contínuo (escolha explícita). */
  endOn: string | null;
  sourceRecordId: string | null;
  origin: 'ocr' | 'manual';
  createdAt: string;
  updatedAt: string;
}

export type NewMedication = Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>;
export type MedicationChanges = Partial<Pick<Medication, 'name' | 'dosage' | 'instructions' | 'startOn' | 'endOn'>>;

export type MedicationDuration = { kind: 'days'; days: number } | { kind: 'continuous' } | { kind: 'unknown' };
export type MedicationStatus = 'active' | 'scheduled' | 'ended';
