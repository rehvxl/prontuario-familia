import type { SupabaseClient } from '@supabase/supabase-js';
import { backendError } from '@/shared/api';
import type { ConsentRepository } from '../domain/consent';
import { CONSENT_COLUMNS, mapConsent, type ConsentRow } from './supabase-mappers';

/**
 * Consentimentos (LGPD art. 11, I). O histórico é preservado: aceitar/revogar passam por RPCs
 * (`accept_consent`/`revoke_consent`), pois a tabela não aceita escrita direta do app.
 */
export function createSupabaseConsentRepository(client: SupabaseClient): ConsentRepository {
  return {
    async listMine() {
      const { data, error } = await client
        .from('consents')
        .select(CONSENT_COLUMNS)
        .order('accepted_at', { ascending: false });
      if (error) throw backendError('consent/list-failed', 'Não foi possível carregar seus consentimentos.', error);
      return ((data ?? []) as ConsentRow[]).map(mapConsent);
    },

    async accept(purpose, version) {
      const { data, error } = await client.rpc('accept_consent', { p_purpose: purpose, p_version: version });
      const row = (Array.isArray(data) ? data[0] : data) as ConsentRow | null;
      if (error || !row) throw backendError('consent/accept-failed', 'Não foi possível registrar o seu aceite. Tente novamente.', error);
      return mapConsent(row);
    },

    async revoke(purpose) {
      const { error } = await client.rpc('revoke_consent', { p_purpose: purpose });
      if (error) throw backendError('consent/revoke-failed', 'Não foi possível revogar o consentimento. Tente novamente.', error);
    },
  };
}
