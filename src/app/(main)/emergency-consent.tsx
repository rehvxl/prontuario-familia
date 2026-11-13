import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useConsentFlow } from '@/application';
import { trackConsentEvent } from '@/features/consent';
import { EmergencyConsentScreen } from '@/screens/emergency-consent';
import { backOrReplace } from '@/shared/ui/navigation';

/** Porta da ficha: reaceite da v3, fora do onboarding. A SessionGate permanece em main. */
export default function EmergencyConsentRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ memberId?: string }>();
  const memberId = typeof params.memberId === 'string' ? params.memberId : '';
  const flow = useConsentFlow();
  const openCard = useCallback(() => {
    if (memberId) router.replace({ pathname: '/(main)/member/[id]/emergency', params: { id: memberId } });
    else router.back();
  }, [memberId, router]);
  // “Agora não” volta ao resumo. A leitura da ficha reabre este modal enquanto faltar a v3, então não é destino.
  const decline = useCallback(() => {
    backOrReplace(
      router,
      memberId ? { pathname: '/(main)/(tabs)/(family)', params: { member: memberId } } : '/(main)/(tabs)/(family)',
    );
  }, [memberId, router]);

  return (
    <EmergencyConsentScreen
      flow={{
        mutate: (input) =>
          flow.mutate(input, {
            onSuccess: () => {
              trackConsentEvent('consent_v3_accepted');
              openCard();
            },
          }),
        isPending: flow.isPending,
        error: flow.error,
      }}
      onDecline={decline}
      onAccepted={openCard}
    />
  );
}
