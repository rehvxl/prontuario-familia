import type { SupabaseClient } from '@supabase/supabase-js';
import { backendError, errorCode, type BackendErrorLike } from '@/shared/api';
import type { VaccineDoseRepository } from '../domain/ports';
import {
  DISMISSAL_COLUMNS,
  DOSE_COLUMNS,
  mapDismissal,
  mapDose,
  toDismissalInsert,
  toDoseInsert,
  toDoseUpdate,
  type VaccineDoseRow,
  type VaccineRuleDismissalRow,
} from './supabase-mappers';

/** Mesmos códigos do adaptador local: único (23505), referência (23503) e check (23514). */
const DUPLICATE = {
  dose: ['vaccine/duplicate-dose', 'Esta dose já está registrada.'],
  dismissal: ['vaccine/duplicate-dismissal', 'Esta indicação já está em "Não se aplica".'],
} as const;

function writeError(error: BackendErrorLike | null, duplicate: keyof typeof DUPLICATE, fallback: string, message: string) {
  const code = errorCode(error);
  if (code === '23505') return backendError(DUPLICATE[duplicate][0], DUPLICATE[duplicate][1], error);
  if (code === '23503') return backendError('vaccine/invalid-reference', 'Pessoa ou documento não encontrado nesta família.', error);
  if (code === '23514') return backendError('vaccine/invalid-dose', 'Confira os dados da dose.', error);
  return backendError(fallback, message, error);
}

export function createSupabaseVaccineDoseRepository(client: SupabaseClient): VaccineDoseRepository {
  const listDoses = async (column: string, value: string) => {
    const { data, error } = await client
      .from('vaccine_doses')
      .select(DOSE_COLUMNS)
      .eq(column, value)
      .order('applied_on', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) throw backendError('vaccine/list-failed', 'Não foi possível carregar as vacinas.', error);
    return ((data ?? []) as VaccineDoseRow[]).map(mapDose);
  };

  const listDismissals = async (column: string, value: string) => {
    const { data, error } = await client.from('vaccine_rule_dismissals').select(DISMISSAL_COLUMNS).eq(column, value);
    if (error) throw backendError('vaccine/list-failed', 'Não foi possível carregar as vacinas.', error);
    return ((data ?? []) as VaccineRuleDismissalRow[]).map(mapDismissal);
  };

  return {
    listByMember: (memberId) => listDoses('member_id', memberId),
    listByFamily: (familyId) => listDoses('family_id', familyId),
    listBySourceRecord: (recordId) => listDoses('source_record_id', recordId),

    async createMany(items) {
      if (items.length === 0) return [];
      // Um insert por chamada: atômico na tabela.
      const { data, error } = await client.from('vaccine_doses').insert(items.map(toDoseInsert)).select(DOSE_COLUMNS);
      if (error || !data) {
        throw writeError(error, 'dose', 'vaccine/create-failed', 'Não foi possível salvar a dose. Tente novamente.');
      }
      return (data as VaccineDoseRow[]).map(mapDose);
    },

    async update(id, changes) {
      const patch = toDoseUpdate(changes);
      const query =
        Object.keys(patch).length === 0
          ? client.from('vaccine_doses').select(DOSE_COLUMNS).eq('id', id).maybeSingle()
          : client.from('vaccine_doses').update(patch).eq('id', id).select(DOSE_COLUMNS).maybeSingle();
      const { data, error } = await query;
      if (error) {
        throw writeError(error, 'dose', 'vaccine/update-failed', 'Não foi possível atualizar a dose. Tente novamente.');
      }
      if (!data) throw backendError('vaccine/not-found', 'Dose não encontrada.');
      return mapDose(data as VaccineDoseRow);
    },

    async remove(id) {
      const { error } = await client.from('vaccine_doses').delete().eq('id', id);
      if (error) throw backendError('vaccine/remove-failed', 'Não foi possível excluir a dose. Tente novamente.', error);
    },

    listDismissals: (memberId) => listDismissals('member_id', memberId),
    listFamilyDismissals: (familyId) => listDismissals('family_id', familyId),

    async dismiss(input) {
      const { data, error } = await client
        .from('vaccine_rule_dismissals')
        .insert(toDismissalInsert(input))
        .select(DISMISSAL_COLUMNS)
        .single();
      if (error || !data) {
        throw writeError(error, 'dismissal', 'vaccine/dismiss-failed', 'Não foi possível salvar. Tente novamente.');
      }
      return mapDismissal(data as VaccineRuleDismissalRow);
    },

    async undismiss(id) {
      const { error } = await client.from('vaccine_rule_dismissals').delete().eq('id', id);
      if (error) throw backendError('vaccine/undismiss-failed', 'Não foi possível desfazer. Tente novamente.', error);
    },
  };
}
