import { useEffect, useState } from 'react';
import { usePreventRemove, useLocalSearchParams, useRouter } from 'expo-router';
import { useMember } from '@/entities/member';
import {
  EmergencyCardForm,
  formFromCard,
  formToDraft,
  resolveEmergencyEntry,
  useEmergencyCardView,
  useSaveEmergencyCard,
  type EmergencyCardFormValues,
} from '@/features/manage-emergency-card';
import { ConfirmSheet, HueProvider, ListSkeleton, Screen, categoricalIndexFor, errorMessage, useTheme } from '@/shared/ui';
import { backOrReplace } from '@/shared/ui/navigation';

const SAVE_ERROR = 'Não foi possível salvar a ficha. Nada foi perdido. Tente de novo.';

/** Folha de edição. Fechar com alteração pede confirmação. Sem rede, não grava. */
export function EditEmergencyCardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { memberId: raw } = useLocalSearchParams<{ memberId?: string }>();
  const memberId = typeof raw === 'string' ? raw : '';
  const access = resolveEmergencyEntry();
  const member = useMember(memberId || undefined);
  const state = useEmergencyCardView(memberId, access === 'card');
  const save = useSaveEmergencyCard();
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [askLeave, setAskLeave] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const hue = theme.personBoard(categoricalIndexFor(memberId));

  useEffect(() => {
    if (access === 'paywall') router.back();
  }, [access, router]);

  usePreventRemove(dirty && !leaving && !save.isPending, () => setAskLeave(true));

  useEffect(() => {
    if (leaving) backOrReplace(router, { pathname: '/(main)/member/[id]/emergency', params: { id: memberId } });
  }, [leaving, memberId, router]);

  const onSave = (values: EmergencyCardFormValues) => {
    if (!member.data) return;
    try {
      const draft = formToDraft(values);
      setFormError(null);
      save.mutate(
        { memberId, familyId: member.data.familyId, draft },
        {
          onSuccess: () => setLeaving(true),
          onError: (error) => setFormError(errorMessage(error, SAVE_ERROR)),
        },
      );
    } catch (error) {
      setFormError(errorMessage(error, SAVE_ERROR));
    }
  };

  const ready = access === 'card' && state.status === 'ready' && member.data;
  return (
    <HueProvider hue={hue}>
      <Screen presentation="sheet" contentContainerStyle={{ borderTopWidth: 4, borderTopColor: hue.tab }}>
        {ready ? (
          <EmergencyCardForm
            identity={state.view.identity}
            initial={formFromCard(state.view.card)}
            medications={state.view.medications}
            offline={state.offline}
            saving={save.isPending}
            error={formError}
            onDirtyChange={setDirty}
            onEditMedications={() => router.push({ pathname: '/(main)/member/[id]/medications', params: { id: memberId } })}
            onSave={onSave}
          />
        ) : (
          <ListSkeleton />
        )}
        <ConfirmSheet
          visible={askLeave}
          title="Sair sem salvar?"
          message="As alterações desta ficha ainda não foram salvas."
          confirmLabel="Sair sem salvar"
          cancelLabel="Continuar editando"
          onConfirm={() => {
            setAskLeave(false);
            setLeaving(true);
          }}
          onCancel={() => setAskLeave(false)}
        />
      </Screen>
    </HueProvider>
  );
}
