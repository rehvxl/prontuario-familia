import type { SupabaseClient } from '@supabase/supabase-js';
import { backendError } from '@/shared/api';
import type { DataExportGateway } from '../domain/session';

/** Exportação LGPD: a Edge Function `export-my-data` roda com o JWT do usuário (RLS aplicada). */
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
