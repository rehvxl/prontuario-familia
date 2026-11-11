import { DEPENDENCY_KEYS, useDependency } from '@/shared/lib';
import type { AttachmentStorage, HealthRecordRepository } from '../domain/health-record';

export const useHealthRecordRepository = () => useDependency<HealthRecordRepository>(DEPENDENCY_KEYS.records);
export const useAttachmentStorage = () => useDependency<AttachmentStorage>(DEPENDENCY_KEYS.storage);
