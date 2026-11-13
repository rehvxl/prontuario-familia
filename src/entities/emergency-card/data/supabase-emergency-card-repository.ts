import type { SupabaseClient } from '@supabase/supabase-js';
import { backendError, errorCode, type BackendErrorLike } from '@/shared/api';
import { DomainError } from '@/shared/lib';
import type { EmergencyCardRepository } from '../domain/ports';
import { emergencyCardFieldsSchema } from '../domain/schema';
import { EMERGENCY_CARD_COLUMNS, mapEmergencyCard, toEmergencyCardInsert, toEmergencyCardUpdate, type EmergencyCardRow } from './supabase-mappers';

const SAVE_FAILED = 'Não foi possível salvar a ficha. Nada foi perdido. Tente de novo.';

function writeError(error: BackendErrorLike | null): DomainError {
  const pg = errorCode(error);
  if (pg === '23514' || pg === '23503' || pg === '23505') {
    return backendError('emergency-card/invalid', 'Não foi possível salvar a ficha. Confira os dados.', error);
  }
  if (pg === 'PGRST116') return backendError('emergency-card/not-found', 'Ficha não encontrada.', error);
  return backendError('emergency-card/save-failed', SAVE_FAILED, error);
}

export function createSupabaseEmergencyCardRepository(client: SupabaseClient): EmergencyCardRepository {
  const getByMember = async (memberId: string) => {
    const { data, error } = await client.from('emergency_cards').select(EMERGENCY_CARD_COLUMNS).eq('member_id', memberId).maybeSingle();
    if (error) throw backendError('emergency-card/list-failed', 'Não foi possível carregar a ficha.', error);
    return data ? mapEmergencyCard(data as EmergencyCardRow) : null;
  };

  return {
    getByMember,

    async upsert(memberId, familyId, draft) {
      const parsed = emergencyCardFieldsSchema.safeParse(draft);
      if (!parsed.success) throw new DomainError('emergency-card/invalid', 'Não foi possível salvar a ficha. Confira os dados.');
      const current = await getByMember(memberId);
      if (!current) {
        const { data, error } = await client
          .from('emergency_cards')
          .insert(toEmergencyCardInsert(memberId, familyId, parsed.data))
          .select(EMERGENCY_CARD_COLUMNS)
          .single();
        if (error || !data) throw writeError(error);
        return mapEmergencyCard(data as EmergencyCardRow);
      }
      const { data, error } = await client
        .from('emergency_cards')
        .update(toEmergencyCardUpdate(parsed.data))
        .eq('member_id', memberId)
        .select(EMERGENCY_CARD_COLUMNS)
        .single();
      if (error || !data) throw writeError(error);
      return mapEmergencyCard(data as EmergencyCardRow);
    },

    async removeByMember(memberId) {
      const { error } = await client.from('emergency_cards').delete().eq('member_id', memberId);
      if (error) throw backendError('emergency-card/save-failed', 'Não foi possível excluir a ficha. Tente novamente.', error);
    },
  };
}
