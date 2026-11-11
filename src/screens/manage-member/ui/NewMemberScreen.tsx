import { useRouter } from 'expo-router';
import { useMyFamily } from '@/entities/family';
import { useAddMember } from '@/features/manage-members';
import { MemberForm } from '@/widgets/member-form';
import { Screen, Spinner } from '@/shared/ui';

/** Adicionar uma pessoa à família. */
export function NewMemberScreen() {
  const router = useRouter();
  const family = useMyFamily().data ?? null;
  const addMember = useAddMember();
  if (!family) return <Screen scroll={false}><Spinner fill label="Carregando" /></Screen>;
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
