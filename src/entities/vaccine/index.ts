export type {
  DismissalReason,
  DoseKey,
  NewVaccineDose,
  NewVaccineRuleDismissal,
  RuleEvaluation,
  ScheduleAge,
  VaccineDose,
  VaccineDoseChanges,
  VaccineEvaluation,
  VaccineRuleDismissal,
  VaccineScheduleRule,
  VaccineStatus,
} from './domain/types';
export type { VaccineDoseRepository } from './domain/ports';
export { VACCINE_ALIASES } from './domain/vaccine-aliases';
export type { VaccineAlias } from './domain/vaccine-aliases';
export {
  DOSE_KEYS,
  SCHEDULE_VERSION,
  VACCINE_SCHEDULE,
  doseLabelOf,
  isCatalogVaccineCode,
  vaccineLabel,
} from './domain/schedule';
export { evaluateVaccines, isUpToDate } from './domain/evaluate';
export { useMemberVaccines, vaccineKeys } from './model/queries';
export { useVaccineDoseRepository } from './model/dependencies';
export { createLocalVaccineDoseRepository } from './data/local-vaccine-dose-repository';
export { createSupabaseVaccineDoseRepository } from './data/supabase-vaccine-dose-repository';
export * from './ui';
