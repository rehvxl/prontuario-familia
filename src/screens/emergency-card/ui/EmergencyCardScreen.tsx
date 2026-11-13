import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { hasEmergencyCardConsent, useMyConsents } from '@/entities/consent';
import { emergencyCardKeys, hasDeclaredContent } from '@/entities/emergency-card';
import { memberKeys } from '@/entities/member';
import {
  EmergencyCardSections,
  calendarDay,
  firstName,
  legalFooter,
  resolveEmergencyEntry,
  trackEmergencyCardEvent,
  useEmergencyCardView,
} from '@/features/manage-emergency-card';
import {
  Banner,
  Button,
  DemoBadge,
  EmptyState,
  ListSkeleton,
  LoadErrorState,
  Screen,
  Text,
  categoricalIndexFor,
  formatDate,
  headerOptions,
  useTheme,
} from '@/shared/ui';
import { useBoardStatusBar } from '@/shared/ui/navigation';

/** Leitura da ficha. Sem o termo v3, não mostra dado clínico: abre o reaceite. */
export function EmergencyCardScreen({ demo = false }: { demo?: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const memberId = typeof id === 'string' ? id : '';
  const consents = useMyConsents();
  const access = consents.isSuccess ? resolveEmergencyEntry(hasEmergencyCardConsent(consents.data)) : 'unknown';
  const state = useEmergencyCardView(memberId);
  const hue = theme.personBoard(categoricalIndexFor(memberId));
  useBoardStatusBar(hue.statusBar);

  useEffect(() => {
    if (access === 'consent') router.replace({ pathname: '/(main)/emergency-consent', params: { memberId } });
    if (access === 'paywall') router.back();
  }, [access, memberId, router]);

  useEffect(() => {
    if (access === 'card' && state.status === 'ready') trackEmergencyCardEvent('emergency_card_opened');
  }, [access, state.status]);

  const retry = () => {
    void queryClient.invalidateQueries({ queryKey: emergencyCardKeys.byMember(memberId) });
    void queryClient.invalidateQueries({ queryKey: memberKeys.detail(memberId) });
  };
  const openEdit = () => router.push({ pathname: '/(main)/emergency/edit', params: { memberId } });
  const openPresent = () => router.push({ pathname: '/(main)/member/[id]/emergency-present', params: { id: memberId } });
  const openMeds = () => router.push({ pathname: '/(main)/member/[id]/medications', params: { id: memberId } });

  if (access !== 'card' || state.status === 'loading') {
    return (
      <Screen testID="emergency-card-screen" board={hue} heading={{ title: 'Ficha de emergência' }}>
        <ListSkeleton />
      </Screen>
    );
  }
  if (state.status === 'missing') {
    return (
      <Screen testID="emergency-card-screen" board={hue} heading={{ title: 'Ficha de emergência' }}>
        <EmptyState icon="person" title="Pessoa não encontrada" message="Ela pode ter sido removida da família." action={{ label: 'Voltar para a família', onPress: () => router.back() }} />
      </Screen>
    );
  }
  if (state.status === 'error') {
    return (
      <Screen testID="emergency-card-screen" board={hue} heading={{ title: 'Ficha de emergência' }}>
        <LoadErrorState onRetry={retry} />
      </Screen>
    );
  }

  const { view, offline } = state;
  const updated = view.card ? formatDate(calendarDay(view.card.updatedAt), 'long') : '';
  const filled = hasDeclaredContent(view.card);
  return (
    <Screen
      testID="emergency-card-screen"
      board={hue}
      heading={{ title: 'Ficha de emergência', subtitle: view.identity.fullName }}
      footer={<Text variant="footnote" color="secondary">{legalFooter(view.card, updated || null)}</Text>}
    >
      <Stack.Screen options={headerOptions(theme, { board: hue, contentTitle: true })} />
      {demo ? <DemoBadge /> : null}
      {offline ? <Banner tone="warning" icon="offline" message="Sem conexão: a ficha está em modo leitura." /> : null}
      {filled ? (
        <>
          <EmergencyCardSections view={view} mode="read" onEditMedications={openMeds} />
          {offline ? null : (
            <>
              <Button label="Mostrar para o profissional" onPress={openPresent} fullWidth style={{ marginTop: theme.layout.sectionGap }} />
              <Button label="Editar ficha" variant="bordered" onPress={openEdit} fullWidth style={{ marginTop: theme.space[3] }} />
            </>
          )}
        </>
      ) : (
        <EmptyState
          icon="medical"
          title={`Ainda não há ficha de emergência de ${firstName(view.identity.fullName)}.`}
          message="Anote alergias, remédios em uso, tipo sanguíneo e com quem falar, para mostrar a um profissional numa urgência. São informações declaradas pela família. O app não diagnostica nem substitui avaliação médica."
          action={offline ? undefined : { label: 'Preencher ficha', onPress: openEdit }}
        />
      )}
    </Screen>
  );
}
