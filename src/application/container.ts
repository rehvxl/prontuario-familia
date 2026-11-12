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
import { createLocalMeasurementRepository, type MeasurementRepository } from '@/entities/measurement';
import { createLocalVaccineDoseRepository, type VaccineDoseRepository } from '@/entities/vaccine';
import { createLocalMedicationRepository, type MedicationRepository } from '@/entities/medication';
import {
  createDemoDocumentTextExtractor,
  createDeviceDocumentTextExtractor,
  unavailableDocumentTextExtractor,
  type DocumentTextExtractor,
} from '@/features/read-document';
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
  measurements: MeasurementRepository;
  vaccineDoses: VaccineDoseRepository;
  medications: MedicationRepository;
  /** Leitor de documentos; não depende do backend (ocr-tecnico.md §b.4). */
  documentText: DocumentTextExtractor;
}

/** Portas que dependem do backend escolhido. */
export type BackendPorts = Omit<AppPorts, 'documentText'>;

export interface AppContainer extends AppPorts {
  mode: BackendMode;
}

function createLocalPorts(): BackendPorts {
  const db = createLocalDb();
  return {
    auth: createLocalAuthGateway(db),
    families: createLocalFamilyRepository(db),
    members: createLocalMemberRepository(db),
    records: createLocalHealthRecordRepository(db),
    storage: createLocalAttachmentStorage(),
    consents: createLocalConsentRepository(db),
    dataExport: createLocalDataExportGateway(db),
    measurements: createLocalMeasurementRepository(db),
    vaccineDoses: createLocalVaccineDoseRepository(db),
    medications: createLocalMedicationRepository(db),
  };
}

/**
 * Leitor de documentos (ocr-tecnico.md §b.4): módulo nativo no binário → nativo, inclusive no modo demo
 * (senão o OCR real nunca seria testado no dev build); sem módulo, demo → texto simulado; Supabase → indisponível.
 */
function createDocumentTextExtractor(mode: BackendMode): DocumentTextExtractor {
  return createDeviceDocumentTextExtractor() ?? (mode === 'demo' ? createDemoDocumentTextExtractor() : unavailableDocumentTextExtractor);
}

/**
 * Escolhe os adaptadores: Supabase quando `env.backendMode === 'supabase'`, senão o modo demonstração local.
 * `overrides` troca portas individuais (testes, previews).
 */
export function createContainer(env: AppEnv, overrides: Partial<AppPorts> = {}): AppContainer {
  const ports = env.backendMode === 'supabase' ? createSupabasePorts() : createLocalPorts();
  return { mode: env.backendMode, ...ports, documentText: createDocumentTextExtractor(env.backendMode), ...overrides };
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
    [DEPENDENCY_KEYS.measurements]: container.measurements,
    [DEPENDENCY_KEYS.vaccineDoses]: container.vaccineDoses,
    [DEPENDENCY_KEYS.medications]: container.medications,
    [DEPENDENCY_KEYS.documentText]: container.documentText,
  };
}
