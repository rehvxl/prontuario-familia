import { useMutation } from '@tanstack/react-query';
import { useCurrentUser } from '@/entities/session';
import { assertExplicitConsent, useAcceptRequiredConsents, type AcceptConsentsInput } from '@/features/consent';
import { useDeviceConsentStore } from './device-consent';

/**
 * Aceite de consentimento da tela de onboarding. Sem sessão, guarda o aceite no aparelho (gravado no servidor
 * logo após o login); com sessão (ex.: nova versão dos termos), grava direto no repositório.
 */
export function useConsentFlow() {
  const user = useCurrentUser().data ?? null;
  const { mutateAsync: acceptRemote } = useAcceptRequiredConsents();
  const acceptOnDevice = useDeviceConsentStore((s) => s.accept);
  return useMutation({
    mutationFn: async (input: AcceptConsentsInput): Promise<void> => {
      assertExplicitConsent(input);
      if (user) await acceptRemote(input);
      else acceptOnDevice();
    },
  });
}
