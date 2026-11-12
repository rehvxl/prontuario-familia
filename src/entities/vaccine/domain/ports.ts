import type {
  NewVaccineDose,
  NewVaccineRuleDismissal,
  VaccineDose,
  VaccineDoseChanges,
  VaccineRuleDismissal,
} from './types';

export interface VaccineDoseRepository {
  listByMember(memberId: string): Promise<VaccineDose[]>;
  listByFamily(familyId: string): Promise<VaccineDose[]>;
  listBySourceRecord(recordId: string): Promise<VaccineDose[]>;
  createMany(items: NewVaccineDose[]): Promise<VaccineDose[]>;
  update(id: string, changes: VaccineDoseChanges): Promise<VaccineDose>;
  remove(id: string): Promise<void>;
  listDismissals(memberId: string): Promise<VaccineRuleDismissal[]>;
  listFamilyDismissals(familyId: string): Promise<VaccineRuleDismissal[]>;
  dismiss(input: NewVaccineRuleDismissal): Promise<VaccineRuleDismissal>;
  undismiss(id: string): Promise<void>;
}
