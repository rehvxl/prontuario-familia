import { useEffect } from 'react';
import { hasValidConsent, useMyConsents } from '@/entities/consent';
import { useMyFamily, type Family } from '@/entities/family';
import { useCurrentUser, type AuthUser } from '@/entities/session';
import { useAcceptRequiredConsents } from '@/features/consent';
import { hasDeviceAppConsent, hasDeviceCurrentConsent, useDeviceConsentStore } from './device-consent';
import { resolveNextStep, type NextStep } from './next-step';

export type SessionStatus = 'loading' | 'error' | 'ready';

export interface SessionState {
  /** `ready` = `nextStep` é confiável e a guarda pode redirecionar; `loading` = mantenha a splash. */
  status: SessionStatus;
  nextStep: NextStep | null;
  user: AuthUser | null;
  family: Family | null;
  /** Tenta de novo as consultas que falharam (botão "Tentar novamente" da tela de erro). */
  retry(): void;
}

/**
 * Estado de sessão para a guarda de navegação: usuário, consentimento, família e a etapa seguinte.
 * Também grava no repositório o aceite dos termos dado no aparelho antes do login (uma vez por sessão).
 */
export function useSessionState(): SessionState {
  const userQuery = useCurrentUser();
  const user = userQuery.data ?? null;
  const signedIn = user !== null;
  const consentsQuery = useMyConsents({ enabled: signedIn });
  const familyQuery = useMyFamily({ enabled: signedIn });
  const hydrated = useDeviceConsentStore((s) => s.hydrated);
  const acceptedVersion = useDeviceConsentStore((s) => s.acceptedVersion);
  const deviceConsent = hasDeviceAppConsent(acceptedVersion);
  const { mutate: acceptConsents, reset: resetAccept, isIdle: acceptIdle, isError: acceptFailed } = useAcceptRequiredConsents();

  const userId = user?.id;
  useEffect(() => {
    resetAccept();
  }, [userId, resetAccept]);

  // Só a v3 aceita no aparelho (onboarding novo) é gravada sozinha. Aceite v2 no aparelho não vira v3.
  const needsFlush = signedIn && hasDeviceCurrentConsent(acceptedVersion) && consentsQuery.isSuccess && !hasValidConsent(consentsQuery.data);
  useEffect(() => {
    if (needsFlush && acceptIdle) acceptConsents({ termsAndPrivacy: true, healthData: true });
  }, [needsFlush, acceptIdle, acceptConsents]);

  const failed = userQuery.isError || (signedIn && (consentsQuery.isError || familyQuery.isError));
  const loading =
    !hydrated ||
    userQuery.isPending ||
    (signedIn && (consentsQuery.isPending || familyQuery.isPending)) ||
    (needsFlush && !acceptFailed);

  const status: SessionStatus = failed ? 'error' : loading ? 'loading' : 'ready';
  const family = familyQuery.data ?? null;
  const nextStep =
    status === 'ready'
      ? resolveNextStep({ user, consents: consentsQuery.data ?? null, family, deviceConsent })
      : null;

  return {
    status,
    nextStep,
    user,
    family,
    retry: () => {
      if (userQuery.isError) void userQuery.refetch();
      if (consentsQuery.isError) void consentsQuery.refetch();
      if (familyQuery.isError) void familyQuery.refetch();
    },
  };
}
