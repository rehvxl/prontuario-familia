import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useConsentFlow } from '@/application';
import { trackConsentEvent } from '@/features/consent';
import { EmergencyConsentScreen } from '@/screens/emergency-consent';

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
      onDecline={() => router.back()}
      onAccepted={openCard}
    />
  );
}
