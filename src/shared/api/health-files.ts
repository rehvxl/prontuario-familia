import type { SupabaseClient } from '@supabase/supabase-js';
import { backendError } from './errors';

/** Bucket privado dos anexos (criado em supabase/migrations/..._storage.sql). */
export const HEALTH_FILES_BUCKET = 'health-files';

const REMOVE_BATCH = 100;

/**
 * Remove arquivos do bucket (em lotes). Arquivos que já não existem não são erro.
 * O SQL não consegue apagar objetos do Storage, então quem exclui registro/membro chama isto ANTES do delete no banco:
 * se falhar, nada foi apagado no banco e o usuário pode tentar de novo.
 */
export async function removeHealthFiles(client: SupabaseClient, storagePaths: string[]): Promise<void> {
  const unique = [...new Set(storagePaths)];
  for (let i = 0; i < unique.length; i += REMOVE_BATCH) {
    const { error } = await client.storage.from(HEALTH_FILES_BUCKET).remove(unique.slice(i, i + REMOVE_BATCH));
    if (error) throw backendError('storage/remove-failed', 'Não foi possível remover os arquivos. Tente novamente.', error);
  }
}
