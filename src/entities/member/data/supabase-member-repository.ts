import type { SupabaseClient } from '@supabase/supabase-js';
import { backendError, removeHealthFiles } from '@/shared/api';
import type { MemberRepository } from '../domain/member';
import { MEMBER_COLUMNS, mapMember, toMemberInsert, toMemberUpdate, type MemberRow } from './supabase-mappers';

export function createSupabaseMemberRepository(client: SupabaseClient): MemberRepository {
  async function getById(id: string) {
    const { data, error } = await client.from('members').select(MEMBER_COLUMNS).eq('id', id).maybeSingle();
    if (error) throw backendError('member/load-failed', 'Não foi possível carregar o membro.', error);
    return data ? mapMember(data as MemberRow) : null;
  }

  return {
    getById,

    async listByFamily(familyId) {
      const { data, error } = await client
        .from('members')
        .select(MEMBER_COLUMNS)
        .eq('family_id', familyId)
        .order('created_at', { ascending: true });
      if (error) throw backendError('member/list-failed', 'Não foi possível carregar os membros da família.', error);
      return ((data ?? []) as MemberRow[]).map(mapMember);
    },

    async create(input) {
      const { data, error } = await client.from('members').insert(toMemberInsert(input)).select(MEMBER_COLUMNS).single();
      if (error || !data) throw backendError('member/create-failed', 'Não foi possível salvar o membro. Tente novamente.', error);
      return mapMember(data as MemberRow);
    },

    async update(id, changes) {
      const patch = toMemberUpdate(changes);
      if (Object.keys(patch).length === 0) {
        const current = await getById(id);
        if (!current) throw backendError('member/not-found', 'Membro não encontrado.');
        return current;
      }
      const { data, error } = await client.from('members').update(patch).eq('id', id).select(MEMBER_COLUMNS).single();
      if (error || !data) throw backendError('member/update-failed', 'Não foi possível atualizar o membro. Tente novamente.', error);
      return mapMember(data as MemberRow);
    },

    async remove(id) {
      // O banco apaga registros e anexos em cascata, mas NÃO os arquivos do Storage: removemos os arquivos primeiro.
      // Se algo falhar, nada foi apagado no banco e o usuário pode repetir.
      const { data, error } = await client
        .from('attachments')
        .select('storage_path,health_records!inner(member_id)')
        .eq('health_records.member_id', id);
      if (error) throw backendError('member/remove-failed', 'Não foi possível excluir o membro. Tente novamente.', error);

      await removeHealthFiles(
        client,
        ((data ?? []) as { storage_path: string }[]).map((a) => a.storage_path),
      );

      const deleted = await client.from('members').delete().eq('id', id);
      if (deleted.error) throw backendError('member/remove-failed', 'Não foi possível excluir o membro. Tente novamente.', deleted.error);
    },
  };
}
