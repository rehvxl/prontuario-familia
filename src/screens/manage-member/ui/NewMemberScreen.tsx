import { useRouter } from 'expo-router';
import { useMyFamily } from '@/entities/family';
import { useAddMember } from '@/features/manage-members';
import { MemberForm } from '@/widgets/member-form';
import { LoadErrorState, Screen, Spinner } from '@/shared/ui';

/** Adicionar uma pessoa à família. */
export function NewMemberScreen() {
  const router = useRouter();
  const familyQuery = useMyFamily();
  const family = familyQuery.data ?? null;
  const addMember = useAddMember();
  if (familyQuery.isError) return <Screen scroll={false} presentation="sheet"><LoadErrorState onRetry={() => familyQuery.refetch()} /></Screen>;
  if (!family) return <Screen scroll={false} presentation="sheet"><Spinner fill label="Carregando" /></Screen>;
  return (
    <Screen testID="new-member-screen" presentation="sheet">
      <MemberForm
        submitLabel="Adicionar pessoa"
        submitting={addMember.isPending}
        error={addMember.error}
        onSubmit={(values) => addMember.mutate({ familyId: family.id, ...values }, { onSuccess: () => router.back() })}
      />
    </Screen>
  );
}
