import { getSupabaseClient } from '@/shared/api';
import { createSupabaseConsentRepository } from '@/entities/consent';
import { createSupabaseFamilyRepository } from '@/entities/family';
import { createSupabaseMemberRepository } from '@/entities/member';
import { createSupabaseAttachmentStorage, createSupabaseHealthRecordRepository } from '@/entities/health-record';
import { createSupabaseAuthGateway, createSupabaseDataExportGateway } from '@/entities/session';
import type { AppPorts } from './container';

/** Portas do modo Supabase: um único cliente (`getSupabaseClient`) compartilhado por todos os adaptadores. */
export function createSupabasePorts(): AppPorts {
  const client = getSupabaseClient();
  return {
    auth: createSupabaseAuthGateway(client),
    families: createSupabaseFamilyRepository(client),
    members: createSupabaseMemberRepository(client),
    records: createSupabaseHealthRecordRepository(client),
    storage: createSupabaseAttachmentStorage(client),
    consents: createSupabaseConsentRepository(client),
    dataExport: createSupabaseDataExportGateway(client),
  };
}
