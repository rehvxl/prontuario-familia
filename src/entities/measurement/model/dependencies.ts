import { DEPENDENCY_KEYS, useDependency } from '@/shared/lib';
import type { MeasurementRepository } from '../domain/ports';

export const useMeasurementRepository = () => useDependency<MeasurementRepository>(DEPENDENCY_KEYS.measurements);
