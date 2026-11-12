import type { SupabaseClient } from '@supabase/supabase-js';
import { backendError, errorCode, type BackendErrorLike } from '@/shared/api';
import type { MeasurementRepository } from '../domain/ports';
import { MEASUREMENT_COLUMNS, mapMeasurement, toMeasurementInsert, toMeasurementUpdate, type MeasurementRow } from './supabase-mappers';

/** Código de domínio para violações do banco (os adaptadores locais lançam os mesmos). */
function writeError(fallback: string, message: string, error: BackendErrorLike | null) {
  const pg = errorCode(error);
  if (pg === '23505') return backendError('measurement/duplicate', 'Este exame já foi salvo a partir deste documento.', error);
  if (pg === '23514' || pg === '23503') return backendError('measurement/invalid', 'Não foi possível salvar a medição. Confira os dados.', error);
  if (pg === 'PGRST116') return backendError('measurement/not-found', 'Medição não encontrada.', error);
  return backendError(fallback, message, error);
}

export function createSupabaseMeasurementRepository(client: SupabaseClient): MeasurementRepository {
  const listBy = async (column: string, value: string) => {
    const { data, error } = await client
      .from('measurements')
      .select(MEASUREMENT_COLUMNS)
      .eq(column, value)
      .order('taken_on', { ascending: true })
      .order('taken_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: true });
    if (error) throw backendError('measurement/list-failed', 'Não foi possível carregar as medições.', error);
    return ((data ?? []) as MeasurementRow[]).map(mapMeasurement);
  };

  return {
    listByMember: (memberId) => listBy('member_id', memberId),
    listByFamily: (familyId) => listBy('family_id', familyId),
    listBySourceRecord: (recordId) => listBy('source_record_id', recordId),

    async createMany(items) {
      if (items.length === 0) return [];
      // Um insert por tabela: atômico no banco.
      const { data, error } = await client.from('measurements').insert(items.map(toMeasurementInsert)).select(MEASUREMENT_COLUMNS);
      if (error || !data) throw writeError('measurement/create-failed', 'Não foi possível salvar a medição. Tente novamente.', error);
      return (data as MeasurementRow[]).map(mapMeasurement);
    },

    async update(id, changes) {
      const patch = toMeasurementUpdate(changes);
      const request = Object.keys(patch).length === 0
        ? client.from('measurements').select(MEASUREMENT_COLUMNS).eq('id', id).single()
        : client.from('measurements').update(patch).eq('id', id).select(MEASUREMENT_COLUMNS).single();
      const { data, error } = await request;
      if (error || !data) throw writeError('measurement/update-failed', 'Não foi possível atualizar a medição. Tente novamente.', error);
      return mapMeasurement(data as MeasurementRow);
    },

    async remove(id) {
      const { error } = await client.from('measurements').delete().eq('id', id);
      if (error) throw backendError('measurement/remove-failed', 'Não foi possível excluir a medição. Tente novamente.', error);
    },
  };
}
