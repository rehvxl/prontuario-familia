import type { SupabaseClient } from '@supabase/supabase-js';
import { backendError, errorCode, errorMessage } from '@/shared/api';
import type { FamilyRepository } from '../domain/family';
import { FAMILY_COLUMNS, isFamilyRole, mapFamily, type FamilyRow } from './supabase-mappers';

interface MembershipRow {
  role: string;
  // PostgREST devolve o objeto (FK N:1); toleramos array por segurança.
  families: FamilyRow | FamilyRow[] | null;
}

export function createSupabaseFamilyRepository(client: SupabaseClient): FamilyRepository {
  return {
    async getMyFamily() {
      // MVP: 1 família por conta. Se houver mais de uma associação, a de `owner` vem primeiro ('owner' > 'editor').
      const { data, error } = await client
        .from('family_memberships')
        .select(`role,families(${FAMILY_COLUMNS})`)
        .order('role', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw backendError('family/load-failed', 'Não foi possível carregar sua família.', error);
      if (!data) return null;

      const row = data as unknown as MembershipRow;
      const family = Array.isArray(row.families) ? row.families[0] : row.families;
      if (!family || !isFamilyRole(row.role)) return null;
      return mapFamily(family, row.role);
    },

    async createFamily(name) {
      const { data, error } = await client.rpc('create_family', { p_name: name.trim() });
      if (error) {
        if (errorMessage(error).includes('family_already_exists')) {
          throw backendError('family/already-exists', 'Você já tem uma família cadastrada.', error);
        }
        if (errorCode(error) === '22023') {
          throw backendError('family/invalid-name', 'O nome da família deve ter entre 2 e 60 caracteres.', error);
        }
        throw backendError('family/create-failed', 'Não foi possível criar a família. Tente novamente.', error);
      }
      const row = (Array.isArray(data) ? data[0] : data) as FamilyRow | null;
      if (!row) throw backendError('family/create-failed', 'Não foi possível criar a família. Tente novamente.');
      return mapFamily(row, 'owner'); // a RPC torna o criador `owner`
    },

    async rename(familyId, name) {
      // A RLS só permite `owner` atualizar: para `editor` nenhuma linha é afetada (PGRST116 no .single()).
      const { data, error } = await client
        .from('families')
        .update({ name: name.trim() })
        .eq('id', familyId)
        .select(FAMILY_COLUMNS)
        .single();
      if (error) {
        if (errorCode(error) === 'PGRST116') {
          throw backendError('family/rename-forbidden', 'Só o responsável principal pode renomear a família.', error);
        }
        if (errorCode(error) === '23514') {
          throw backendError('family/invalid-name', 'O nome da família deve ter entre 2 e 60 caracteres.', error);
        }
        throw backendError('family/rename-failed', 'Não foi possível renomear a família. Tente novamente.', error);
      }
      return mapFamily(data as FamilyRow, 'owner');
    },
  };
}
