import type { SupabaseClient } from '@supabase/supabase-js';
import { backendError, errorCode, type BackendErrorLike } from '@/shared/api';
import type { MedicationRepository } from '../domain/ports';
import { MEDICATION_COLUMNS, mapMedication, toMedicationInsert, toMedicationUpdate, type MedicationRow } from './supabase-mappers';

/** Código de domínio para violações do banco (o adaptador local lança os mesmos). */
function writeError(fallback: string, message: string, error: BackendErrorLike | null) {
  const pg = errorCode(error);
  if (pg === '23514' || pg === '23503') return backendError('medication/invalid', 'Não foi possível salvar o medicamento. Confira os dados.', error);
  if (pg === 'PGRST116') return backendError('medication/not-found', 'Medicamento não encontrado.', error);
  return backendError(fallback, message, error);
}

export function createSupabaseMedicationRepository(client: SupabaseClient): MedicationRepository {
  const listBy = async (column: string, value: string) => {
    const { data, error } = await client
      .from('medications')
      .select(MEDICATION_COLUMNS)
      .eq(column, value)
      .order('start_on', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw backendError('medication/list-failed', 'Não foi possível carregar os medicamentos.', error);
    return ((data ?? []) as MedicationRow[]).map(mapMedication);
  };

  return {
    listByMember: (memberId) => listBy('member_id', memberId),
    listByFamily: (familyId) => listBy('family_id', familyId),
    listBySourceRecord: (recordId) => listBy('source_record_id', recordId),

    async createMany(items) {
      if (items.length === 0) return [];
      const { data, error } = await client.from('medications').insert(items.map(toMedicationInsert)).select(MEDICATION_COLUMNS);
      if (error || !data) throw writeError('medication/create-failed', 'Não foi possível salvar o medicamento. Tente novamente.', error);
      return (data as MedicationRow[]).map(mapMedication);
    },

    async update(id, changes) {
      const patch = toMedicationUpdate(changes);
      const request = Object.keys(patch).length === 0
        ? client.from('medications').select(MEDICATION_COLUMNS).eq('id', id).single()
        : client.from('medications').update(patch).eq('id', id).select(MEDICATION_COLUMNS).single();
      const { data, error } = await request;
      if (error || !data) throw writeError('medication/update-failed', 'Não foi possível atualizar o medicamento. Tente novamente.', error);
      return mapMedication(data as MedicationRow);
    },

    async remove(id) {
      const { error } = await client.from('medications').delete().eq('id', id);
      if (error) throw backendError('medication/remove-failed', 'Não foi possível excluir o medicamento. Tente novamente.', error);
    },
  };
}
