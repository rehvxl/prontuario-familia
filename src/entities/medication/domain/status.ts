import type { Medication, MedicationStatus } from './types';

/** R5: início no futuro → 'scheduled'; fim antes de hoje → 'ended'; senão 'active' (o dia do fim ainda é uso). */
export function medicationStatus(m: Pick<Medication, 'startOn' | 'endOn'>, today: string): MedicationStatus {
  if (m.startOn > today) return 'scheduled';
  if (m.endOn !== null && m.endOn < today) return 'ended';
  return 'active';
}
