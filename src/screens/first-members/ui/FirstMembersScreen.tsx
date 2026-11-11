import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMyFamily } from '@/entities/family';
import { MemberListItem, useMembers } from '@/entities/member';
import { useAddMember } from '@/features/manage-members';
import { MemberForm } from '@/widgets/member-form';
import { Button, Divider, Screen, Spinner, Text, useTheme } from '@/shared/ui';

/** Segundo passo do setup: cadastrar as primeiras pessoas. Depois da primeira, dá para concluir. */
export function FirstMembersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const family = useMyFamily().data ?? null;
  const members = useMembers(family?.id).data ?? [];
  const addMember = useAddMember();
  const [formKey, setFormKey] = useState(0);

  const finish = () => router.replace('/(main)/(tabs)/(family)');

  if (!family) return <Screen scroll={false}><Spinner fill label="Carregando" /></Screen>;

  return (
    <Screen
      testID="first-members-screen"
      footer={members.length > 0 ? <Button label="Concluir" onPress={finish} fullWidth testID="finish-setup" /> : undefined}
    >
      <Text variant="title1">Quem faz parte da {family.name}?</Text>
      <Text color="secondary" style={{ marginTop: theme.space[2], marginBottom: theme.space[6] }}>
        Adicione quem terá o histórico de saúde guardado aqui. Você pode incluir mais pessoas depois.
      </Text>
      {members.length > 0 ? (
        <View style={{ marginBottom: theme.space[6] }}>
          {members.map((m, i) => (
            <View key={m.id}>
              {i > 0 ? <Divider /> : null}
              <MemberListItem member={m} />
            </View>
          ))}
          <Text variant="headline" style={{ marginTop: theme.space[6] }}>
            Adicionar outra pessoa
          </Text>
        </View>
      ) : null}
      <MemberForm
        key={formKey}
        submitLabel={members.length > 0 ? 'Adicionar pessoa' : 'Adicionar primeira pessoa'}
        submitting={addMember.isPending}
        error={addMember.error}
        onSubmit={(values) =>
          addMember.mutate({ familyId: family.id, ...values }, { onSuccess: () => setFormKey((k) => k + 1) })
        }
      />
    </Screen>
  );
}
