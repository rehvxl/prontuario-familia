import { useQuery } from '@tanstack/react-query';
import { useMeasurementRepository } from './dependencies';

export const measurementKeys = {
  /** Prefixo de todas as consultas de medições. */
  all: ['measurements'] as const,
  byMember: (id: string) => ['measurements', 'member', id] as const,
  byFamily: (id: string) => ['measurements', 'family', id] as const,
  /** Itens ligados a um documento (A15). */
  bySource: (id: string) => ['measurements', 'source', id] as const,
};

/** Exames e sinais vitais da pessoa, em ordem cronológica. */
export function useMemberMeasurements(memberId: string) {
  const repo = useMeasurementRepository();
  return useQuery({ queryKey: measurementKeys.byMember(memberId), queryFn: () => repo.listByMember(memberId), enabled: !!memberId });
}

/** Medições de toda a família (painel). */
export function useFamilyMeasurements(familyId: string) {
  const repo = useMeasurementRepository();
  return useQuery({ queryKey: measurementKeys.byFamily(familyId), queryFn: () => repo.listByFamily(familyId), enabled: !!familyId });
}
