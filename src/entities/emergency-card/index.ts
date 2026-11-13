export type { EmergencyCardRepository } from './domain/ports';
export type { EmergencyAllergy, EmergencyCard, EmergencyCardDraft, EmergencyCondition, EmergencyContact, BloodType } from './domain/schema';
export type { EmergencyIdentitySnapshot, EmergencyMedicationSnapshot, EmergencyReadSnapshot } from './domain/snapshot';
export {
  BLOOD_TYPES,
  BLOOD_TYPE_LABELS,
  emergencyCardFieldsSchema,
  filledFieldCount,
  hasDeclaredContent,
} from './domain/schema';
export { emergencyCardKeys, useMemberEmergencyCard } from './model/queries';
export { useEmergencyCardRepository } from './model/dependencies';
export { createLocalEmergencyCardRepository } from './data/local-emergency-card-repository';
export { createSupabaseEmergencyCardRepository } from './data/supabase-emergency-card-repository';
export { clearEmergencyReadCache, readEmergencyReadCache, writeEmergencyReadCache } from './data/read-cache';
