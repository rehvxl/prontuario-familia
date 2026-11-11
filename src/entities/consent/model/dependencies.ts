import { DEPENDENCY_KEYS, useDependency } from '@/shared/lib';
import type { ConsentRepository } from '../domain/consent';

export const useConsentRepository = () => useDependency<ConsentRepository>(DEPENDENCY_KEYS.consents);
