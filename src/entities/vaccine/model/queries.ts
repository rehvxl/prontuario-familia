import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { VaccineDose, VaccineRuleDismissal } from '../domain/types';
import { useVaccineDoseRepository } from './dependencies';

export const vaccineKeys = {
  /** Prefixo de tudo de vacinas (invalidar depois de qualquer mudança em dose ou dispensa). */
  all: ['vaccines'] as const,
  byMember: (id: string) => ['vaccines', 'member', id] as const,
  byFamily: (id: string) => ['vaccines', 'family', id] as const,
  /** Dispensas ("Não se aplica") da família. */
  dismissals: (id: string) => ['vaccines', 'dismissals', id] as const,
};

/** Doses e dispensas da pessoa numa consulta só (a carteira precisa das duas para calcular as pendências). */
export function useMemberVaccines(
  memberId: string,
): UseQueryResult<{ doses: VaccineDose[]; dismissals: VaccineRuleDismissal[] }> {
  const repo = useVaccineDoseRepository();
  return useQuery({
    queryKey: vaccineKeys.byMember(memberId),
    queryFn: async () => {
      const [doses, dismissals] = await Promise.all([repo.listByMember(memberId), repo.listDismissals(memberId)]);
      return { doses, dismissals };
    },
    enabled: !!memberId,
  });
}
