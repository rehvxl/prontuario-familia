import type { SupabaseClient } from '@supabase/supabase-js';
import { backendError } from '@/shared/api';
import type { DataExportGateway } from '../domain/session';

/**
 * Exportação LGPD: a Edge Function `export-my-data` roda com o JWT do usuário (RLS aplicada).
 * Desde o contrato do PR #13 o JSON sai com `format_version: 3` e `emergency_cards`
 * (`id`, `family_id`, `member_id`, `blood_type`, `no_known_allergies`, `allergies`, `conditions`,
 * `contacts`, `notes`, `created_at`, `updated_at`). `created_by` fica de fora. O app só repassa o arquivo.
 */
export function createSupabaseDataExportGateway(client: SupabaseClient): DataExportGateway {
  return {
    async exportMyData() {
      const { data, error } = await client.functions.invoke('export-my-data', { method: 'POST' });
      if (error || data === null || data === undefined) {
        throw backendError('export/failed', 'Não foi possível exportar seus dados agora. Tente novamente.', error);
      }
      return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    },
  };
}
