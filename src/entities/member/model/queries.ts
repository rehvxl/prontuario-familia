import { useQuery } from '@tanstack/react-query';
import { useMemberRepository } from './dependencies';

export const memberKeys = {
  all: ['members'] as const,
  list: (familyId: string) => ['members', 'list', familyId] as const,
  detail: (id: string) => ['members', 'detail', id] as const,
};

/** Pessoas da família, da mais antiga para a mais recente. Desabilitada sem `familyId`. */
export function useMembers(familyId: string | undefined) {
  const members = useMemberRepository();
  return useQuery({
    queryKey: memberKeys.list(familyId ?? ''),
    queryFn: () => members.listByFamily(familyId ?? ''),
    enabled: !!familyId,
  });
}

export function useMember(id: string | undefined) {
  const members = useMemberRepository();
  return useQuery({ queryKey: memberKeys.detail(id ?? ''), queryFn: () => members.getById(id ?? ''), enabled: !!id });
}
