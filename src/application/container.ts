import type { AppEnv, BackendMode } from '@/shared/config';
import { DEPENDENCY_KEYS, createLocalDb } from '@/shared/lib';
import {
  createLocalAuthGateway,
  createLocalDataExportGateway,
  type AuthGateway,
  type DataExportGateway,
} from '@/entities/session';
import { createLocalFamilyRepository, type FamilyRepository } from '@/entities/family';
import { createLocalMemberRepository, type MemberRepository } from '@/entities/member';
import {
  createLocalAttachmentStorage,
  createLocalHealthRecordRepository,
  type AttachmentStorage,
  type HealthRecordRepository,
} from '@/entities/health-record';
import { createLocalConsentRepository, type ConsentRepository } from '@/entities/consent';
import { createSupabasePorts } from './supabase-ports';

/** Implementações concretas das portas do domínio (docs/ARCHITECTURE.md §3). */
export interface AppPorts {
  auth: AuthGateway;
  families: FamilyRepository;
  members: MemberRepository;
  records: HealthRecordRepository;
  storage: AttachmentStorage;
  consents: ConsentRepository;
  dataExport: DataExportGateway;
}

export interface AppContainer extends AppPorts {
  mode: BackendMode;
}

function createLocalPorts(): AppPorts {
  const db = createLocalDb();
  return {
    auth: createLocalAuthGateway(db),
    families: createLocalFamilyRepository(db),
    members: createLocalMemberRepository(db),
    records: createLocalHealthRecordRepository(db),
    storage: createLocalAttachmentStorage(),
    consents: createLocalConsentRepository(db),
    dataExport: createLocalDataExportGateway(db),
  };
}

/**
 * Escolhe os adaptadores: Supabase quando `env.backendMode === 'supabase'`, senão o modo demonstração local.
 * `overrides` troca portas individuais (testes, previews).
 */
export function createContainer(env: AppEnv, overrides: Partial<AppPorts> = {}): AppContainer {
  const ports = env.backendMode === 'supabase' ? createSupabasePorts() : createLocalPorts();
  return { mode: env.backendMode, ...ports, ...overrides };
}

/** Mapa chave → porta no formato do DI genérico de `@/shared/lib` (`DependencyProvider`). */
export function containerDependencies(container: AppContainer): Record<string, unknown> {
  return {
    [DEPENDENCY_KEYS.auth]: container.auth,
    [DEPENDENCY_KEYS.families]: container.families,
    [DEPENDENCY_KEYS.members]: container.members,
    [DEPENDENCY_KEYS.records]: container.records,
    [DEPENDENCY_KEYS.storage]: container.storage,
    [DEPENDENCY_KEYS.consents]: container.consents,
    [DEPENDENCY_KEYS.dataExport]: container.dataExport,
  };
}
