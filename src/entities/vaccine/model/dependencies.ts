import { DEPENDENCY_KEYS, useDependency } from '@/shared/lib';
import type { VaccineDoseRepository } from '../domain/ports';

export const useVaccineDoseRepository = () => useDependency<VaccineDoseRepository>(DEPENDENCY_KEYS.vaccineDoses);
