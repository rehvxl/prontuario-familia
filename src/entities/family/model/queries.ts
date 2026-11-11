import { useQuery } from '@tanstack/react-query';
import { useFamilyRepository } from './dependencies';

export const familyKeys = {
  mine: ['family', 'mine'] as const,
};

/** Família do usuário logado (`null` = ainda não criou). Passe `enabled: false` enquanto não houver sessão. */
export function useMyFamily(options: { enabled?: boolean } = {}) {
  const families = useFamilyRepository();
  return useQuery({ queryKey: familyKeys.mine, queryFn: () => families.getMyFamily(), enabled: options.enabled ?? true });
}
