import { DEPENDENCY_KEYS, useDependency } from '@/shared/lib';
import type { EmergencyCardRepository } from '../domain/ports';

export const useEmergencyCardRepository = () => useDependency<EmergencyCardRepository>(DEPENDENCY_KEYS.emergencyCards);
