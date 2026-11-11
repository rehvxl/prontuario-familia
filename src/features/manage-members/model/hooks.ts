import { useMutation, useQueryClient } from '@tanstack/react-query';
import { memberKeys, useMemberRepository, type MemberChanges, type NewMember } from '@/entities/member';
import { recordKeys } from '@/entities/health-record';
import { addMember, removeMember, updateMember } from '../domain/manage-members';

export function useAddMember() {
  const members = useMemberRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewMember) => addMember({ members }, input),
    onSuccess: (member) => queryClient.invalidateQueries({ queryKey: memberKeys.list(member.familyId) }),
  });
}

export function useUpdateMember() {
  const members = useMemberRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; changes: MemberChanges }) => updateMember({ members }, v.id, v.changes),
    onSuccess: (member) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: memberKeys.list(member.familyId) }),
        queryClient.invalidateQueries({ queryKey: memberKeys.detail(member.id) }),
      ]),
  });
}

/** Remove a pessoa e seus registros: invalida pessoas e tudo o que é de registros (linha do tempo, busca, detalhe). */
export function useRemoveMember() {
  const members = useMemberRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeMember({ members }, id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: memberKeys.detail(id) });
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: memberKeys.all }),
        queryClient.invalidateQueries({ queryKey: recordKeys.all }),
      ]);
    },
  });
}
