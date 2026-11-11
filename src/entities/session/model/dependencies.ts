import { DEPENDENCY_KEYS, useDependency } from '@/shared/lib';
import type { AuthGateway, DataExportGateway } from '../domain/session';

export const useAuthGateway = () => useDependency<AuthGateway>(DEPENDENCY_KEYS.auth);
export const useDataExportGateway = () => useDependency<DataExportGateway>(DEPENDENCY_KEYS.dataExport);
