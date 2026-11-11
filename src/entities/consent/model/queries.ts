import { useQuery } from '@tanstack/react-query';
import { useConsentRepository } from './dependencies';

export const consentKeys = {
  mine: ['consents', 'mine'] as const,
};

/** Consentimentos do usuário logado. Passe `enabled: false` enquanto não houver sessão. */
export function useMyConsents(options: { enabled?: boolean } = {}) {
  const consents = useConsentRepository();
  return useQuery({ queryKey: consentKeys.mine, queryFn: () => consents.listMine(), enabled: options.enabled ?? true });
}
