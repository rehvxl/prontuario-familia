import { useEffect } from 'react';
import { View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { hasEmergencyCardConsent, useMyConsents } from '@/entities/consent';
import {
  EmergencyCardSections,
  legalFooter,
  calendarDay,
  resolveEmergencyEntry,
  trackEmergencyCardEvent,
  useEmergencyCardView,
} from '@/features/manage-emergency-card';
import { Button, DemoBadge, IconButton, ListSkeleton, Screen, Text, formatDate, useTheme } from '@/shared/ui';
import { backOrReplace } from '@/shared/ui/navigation';

function Awake() {
  useKeepAwake();
  return null;
}

/** Modo profissional: tela cheia, fonte grande, sem a cor da pessoa. A tela fica ligada só aqui. */
export function PresentEmergencyCardScreen({ demo = false }: { demo?: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const memberId = typeof id === 'string' ? id : '';
  const consents = useMyConsents();
  const access = consents.isSuccess ? resolveEmergencyEntry(hasEmergencyCardConsent(consents.data)) : 'unknown';
  const state = useEmergencyCardView(memberId, access === 'card');

  useEffect(() => {
    if (access === 'consent') router.replace({ pathname: '/(main)/emergency-consent', params: { memberId } });
    if (access === 'paywall') router.back();
  }, [access, memberId, router]);

  useEffect(() => {
    if (access === 'card' && state.status === 'ready') trackEmergencyCardEvent('emergency_card_present_mode');
  }, [access, state.status]);

  const close = () => backOrReplace(router, { pathname: '/(main)/member/[id]/emergency', params: { id: memberId } });
  // fullScreenModal sem cabeçalho: o fechar aparece em todo estado, senão erro ou carregamento prendem a pessoa aqui.
  const closeRow = (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
      <IconButton icon="close" accessibilityLabel="Fechar a tela para o profissional" onPress={close} />
    </View>
  );
  if (access !== 'card' || state.status !== 'ready') {
    const failed = consents.isError || state.status === 'error' || state.status === 'missing';
    return (
      <Screen testID="emergency-present-screen">
        {closeRow}
        {failed ? <Text variant="body">Não foi possível abrir a ficha agora.</Text> : <ListSkeleton />}
      </Screen>
    );
  }
  const updated = state.view.card ? formatDate(calendarDay(state.view.card.updatedAt), 'long') : '';
  return (
    <Screen testID="emergency-present-screen">
      <Awake />
      {closeRow}
      {demo ? <DemoBadge /> : null}
      <EmergencyCardSections view={state.view} mode="present" />
      <Text variant="footnote" color="secondary" style={{ marginTop: theme.layout.sectionGap }}>
        {legalFooter(state.view.card, updated || null)}
      </Text>
      <Button label="Fechar" variant="bordered" onPress={close} fullWidth style={{ marginTop: theme.space[4] }} />
    </Screen>
  );
}
