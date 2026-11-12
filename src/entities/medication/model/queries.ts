import { useQuery } from '@tanstack/react-query';
import { useMedicationRepository } from './dependencies';

export const medicationKeys = {
  /** Prefixo de todas as consultas de medicamentos. */
  all: ['medications'] as const,
  byMember: (id: string) => ['medications', 'member', id] as const,
  byFamily: (id: string) => ['medications', 'family', id] as const,
};

/** Medicamentos da pessoa, início mais recente primeiro. */
export function useMemberMedications(memberId: string) {
  const repo = useMedicationRepository();
  return useQuery({ queryKey: medicationKeys.byMember(memberId), queryFn: () => repo.listByMember(memberId), enabled: !!memberId });
}
