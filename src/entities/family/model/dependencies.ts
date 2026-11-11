import { DEPENDENCY_KEYS, useDependency } from '@/shared/lib';
import type { FamilyRepository } from '../domain/family';

export const useFamilyRepository = () => useDependency<FamilyRepository>(DEPENDENCY_KEYS.families);
