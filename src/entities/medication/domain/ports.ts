import type { Medication, MedicationChanges, NewMedication } from './types';

export interface MedicationRepository {
  listByMember(memberId: string): Promise<Medication[]>;
  listByFamily(familyId: string): Promise<Medication[]>;
  listBySourceRecord(recordId: string): Promise<Medication[]>;
  createMany(items: NewMedication[]): Promise<Medication[]>;
  update(id: string, changes: MedicationChanges): Promise<Medication>;
  remove(id: string): Promise<void>;
}
