import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMyFamily } from '@/entities/family';
import { MemberListItem, useMembers } from '@/entities/member';
import { useAddMember } from '@/features/manage-members';
import { MemberForm } from '@/widgets/member-form';
import { Button, ListSection, LoadErrorState, Screen, SectionHeader, Spinner, TabRail, Text, categoricalIndexFor, useTheme } from '@/shared/ui';

/** Sem cabeçalho nativo: a divisória vai até a barra de status. */
const EDGES = ['top', 'left', 'right', 'bottom'] as const;

/**
 * Segundo passo do setup: cadastrar as primeiras pessoas. Depois da primeira, dá para concluir.
 * v4: na capa da família, cada pessoa ganha a sua divisória ao ser adicionada: a aba dela surge na régua, na cor
 * que terá no app. A régua aqui é só a prévia da pasta (decorativa); quem informa é a lista "Já adicionadas".
 */
export function FirstMembersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const familyQuery = useMyFamily();
  const family = familyQuery.data ?? null;
  const members = useMembers(family?.id).data ?? [];
  const addMember = useAddMember();
  const [formKey, setFormKey] = useState(0);

  const finish = () => router.replace('/(main)/(tabs)/(family)');

  if (familyQuery.isError) return <Screen scroll={false} board="ultramar" edges={EDGES}><LoadErrorState onRetry={() => familyQuery.refetch()} /></Screen>;
  if (!family) return <Screen scroll={false} board="ultramar" edges={EDGES}><Spinner fill label="Carregando" /></Screen>;

  const tabs = [
    { id: 'family', label: 'Família', hue: 'ultramar' as const, selected: true },
    ...members.map((m) => ({ id: m.id, label: m.fullName.trim().split(/\s+/)[0] ?? m.fullName, hue: theme.personBoard(categoricalIndexFor(m.id)) })),
  ];

  return (
    <Screen
      testID="first-members-screen"
      board="ultramar"
      edges={EDGES}
      rail={
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID="first-members-rail">
          <TabRail items={tabs} onSelect={() => undefined} />
        </View>
      }
      heading={{ title: `Quem faz parte da ${family.name}?` }}
      footer={members.length > 0 ? <Button label="Concluir" onPress={finish} fullWidth testID="finish-setup" /> : undefined}
    >
      <StatusBar style={theme.hues.family.statusBar} />
      <Text color="secondary" style={{ marginBottom: theme.space[6] }}>
        Adicione quem terá o histórico de saúde guardado aqui. Você pode incluir mais pessoas depois.
      </Text>
      {members.length > 0 ? (
        <View style={{ marginBottom: theme.space[2] }}>
          <ListSection header="Já adicionadas">
            {members.map((m) => (
              <MemberListItem key={m.id} member={m} />
            ))}
          </ListSection>
          <SectionHeader title="Adicionar outra pessoa" />
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
