import type { SupabaseClient } from '@supabase/supabase-js';
import { backendError, errorCode, removeHealthFiles } from '@/shared/api';
import type { HealthRecordRepository, RecordQuery } from '../domain/health-record';
import {
  ATTACHMENT_SELECT,
  RECORD_SELECT,
  mapAttachment,
  mapHealthRecord,
  toRecordInsert,
  type AttachmentRow,
  type HealthRecordRow,
} from './supabase-mappers';

export function createSupabaseHealthRecordRepository(client: SupabaseClient): HealthRecordRepository {
  return {
    async list(familyId, query: RecordQuery = {}) {
      const text = query.text?.trim();
      const types = query.types && query.types.length > 0 ? query.types : null;

      // Busca textual: RPC (tsvector + unaccent + prefixo; security invoker, a RLS continua valendo).
      // Sem texto: consulta direta. Em ambos os casos a ordem é record_date desc, created_at desc.
      const request = text
        ? client.rpc('search_health_records', {
            p_family_id: familyId,
            p_text: text,
            p_member_id: query.memberId ?? null,
            p_types: types,
          })
        : (() => {
            let q = client.from('health_records').select(RECORD_SELECT).eq('family_id', familyId);
            if (query.memberId) q = q.eq('member_id', query.memberId);
            if (types) q = q.in('type', types);
            return q;
          })();

      const { data, error } = await (text ? request.select(RECORD_SELECT) : request)
        .order('record_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw backendError('record/list-failed', 'Não foi possível carregar os registros.', error);
      return ((data ?? []) as unknown as HealthRecordRow[]).map(mapHealthRecord);
    },

    async getById(id) {
      const { data, error } = await client.from('health_records').select(RECORD_SELECT).eq('id', id).maybeSingle();
      if (error) throw backendError('record/load-failed', 'Não foi possível carregar o registro.', error);
      return data ? mapHealthRecord(data as unknown as HealthRecordRow) : null;
    },

    async create(input) {
      const { data, error } = await client.from('health_records').insert(toRecordInsert(input)).select(RECORD_SELECT).single();
      if (error || !data) throw backendError('record/create-failed', 'Não foi possível salvar o registro. Tente novamente.', error);
      return mapHealthRecord(data as unknown as HealthRecordRow);
    },

    async remove(id) {
      // Arquivos primeiro (o SQL não apaga objetos do Storage); se falhar, o registro continua e dá para repetir.
      const { data, error } = await client.from('attachments').select('storage_path').eq('record_id', id);
      if (error) throw backendError('record/remove-failed', 'Não foi possível excluir o registro. Tente novamente.', error);
      await removeHealthFiles(
        client,
        ((data ?? []) as { storage_path: string }[]).map((a) => a.storage_path),
      );

      const deleted = await client.from('health_records').delete().eq('id', id);
      if (deleted.error) throw backendError('record/remove-failed', 'Não foi possível excluir o registro. Tente novamente.', deleted.error);
    },

    async addAttachment(recordId, attachment) {
      // storage_path = `{familyId}/{recordId}/{id}.{ext}`; o banco confere o formato (CHECK) e a RLS confere a família.
      const familyId = attachment.storagePath.split('/')[0];
      if (!familyId) throw backendError('attachment/invalid-path', 'Caminho de arquivo inválido.');

      const { data, error } = await client
        .from('attachments')
        .insert({
          id: attachment.id,
          family_id: familyId,
          record_id: recordId,
          storage_path: attachment.storagePath,
          file_name: attachment.fileName,
          mime_type: attachment.mimeType,
          size_bytes: attachment.sizeBytes,
        })
        .select(ATTACHMENT_SELECT)
        .single();
      if (error || !data) {
        const code = errorCode(error) === '23503' ? 'attachment/record-not-found' : 'attachment/create-failed';
        throw backendError(code, 'Não foi possível anexar o arquivo. Tente novamente.', error);
      }
      return mapAttachment(data as unknown as AttachmentRow);
    },
  };
}
