import { useMutation } from '@tanstack/react-query';
import { useRevokeConsents } from '@/features/consent';
import { useDeleteAccount } from '@/features/delete-account';
import { useDeviceConsentStore } from './device-consent';

/**
 * Excluir conta = apagar no servidor/aparelho (feature) + esquecer o aceite deste aparelho, para que o app
 * volte ao onboarding como numa instalação nova (decisão do Tech Lead, v0.1.4).
 */
export function useDeleteAccountFlow() {
  const { mutateAsync } = useDeleteAccount();
  const clearDeviceConsent = useDeviceConsentStore((s) => s.clear);
  return useMutation({
    mutationFn: async (): Promise<void> => {
      await mutateAsync();
      clearDeviceConsent();
    },
  });
}

/**
 * Revogar consentimento = revogar no repositório + esquecer o aceite do aparelho. Sem o segundo passo,
 * a sessão regravaria o aceite do aparelho logo em seguida (ver `useSessionState`) e a revogação não valeria.
 */
export function useRevokeConsentFlow() {
  const { mutateAsync } = useRevokeConsents();
  const clearDeviceConsent = useDeviceConsentStore((s) => s.clear);
  return useMutation({
    mutationFn: async (): Promise<void> => {
      clearDeviceConsent();
      await mutateAsync();
    },
  });
}
