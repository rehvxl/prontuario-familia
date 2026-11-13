import { useQuery } from '@tanstack/react-query';
import { useEmergencyCardRepository } from './dependencies';

export const emergencyCardKeys = {
  all: ['emergency-cards'] as const,
  byMember: (id: string) => ['emergency-cards', 'member', id] as const,
};

/** Ficha da pessoa. `null` é o vazio conhecido (ainda não há linha). */
export function useMemberEmergencyCard(memberId: string) {
  const repo = useEmergencyCardRepository();
  return useQuery({ queryKey: emergencyCardKeys.byMember(memberId), queryFn: () => repo.getByMember(memberId), enabled: !!memberId });
}
