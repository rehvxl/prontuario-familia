import { useMutation, useQueryClient } from '@tanstack/react-query';
import { consentKeys, useConsentRepository } from '@/entities/consent';
import { acceptRequiredConsents, type AcceptConsentsInput } from '../domain/accept-required-consents';

export function useAcceptRequiredConsents() {
  const consents = useConsentRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AcceptConsentsInput) => acceptRequiredConsents({ consents }, input),
    onSuccess: (after) => queryClient.setQueryData(consentKeys.mine, after),
  });
}
