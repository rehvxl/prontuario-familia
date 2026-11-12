import { DEPENDENCY_KEYS, useDependency } from '@/shared/lib';
import type { MedicationRepository } from '../domain/ports';

export const useMedicationRepository = () => useDependency<MedicationRepository>(DEPENDENCY_KEYS.medications);
