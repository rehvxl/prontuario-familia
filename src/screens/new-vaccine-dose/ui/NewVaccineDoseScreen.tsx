import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { EmptyState, HueProvider, ListSkeleton, LoadErrorState, Screen, categoricalIndexFor, useTheme } from '@/shared/ui';
import { useMemberVaccines } from '@/entities/vaccine';
import { VaccineDoseForm } from '@/features/record-vaccine-dose';

/** Registrar dose de vacina (spec F3.5; formSheet vaccine-dose/new?memberId=). Com `doseId`, edita a dose (L8, padrão F2.9). */
export function NewVaccineDoseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ memberId?: string; doseId?: string }>();
  const memberId = typeof params.memberId === 'string' ? params.memberId : '';
  const doseId = typeof params.doseId === 'string' && params.doseId !== '' ? params.doseId : null;
  // Só a edição precisa das doses; sem `doseId` a consulta fica desligada.
  const vaccines = useMemberVaccines(doseId ? memberId : '');
  const dose = doseId ? vaccines.data?.doses.find((d) => d.id === doseId) : undefined;
  const title = doseId ? 'Editar dose' : 'Nova dose';
  const theme = useTheme();
  // v4: folha simples com o filete da aba da pessoa no topo; os controles seguem a tinta dela.
  const hue = theme.personBoard(categoricalIndexFor(memberId));

  const body = (() => {
    if (!memberId) return <EmptyState icon="person" title="Pessoa não encontrada" message="Volte e abra a carteira de vacinas da pessoa." action={{ label: 'Fechar', onPress: () => router.back() }} />;
    if (doseId && vaccines.isError) return <LoadErrorState onRetry={() => void vaccines.refetch()} />;
    if (doseId && vaccines.isPending) return <ListSkeleton count={3} />;
    if (doseId && !dose) return <EmptyState icon="shot" title="Dose não encontrada" message="Ela pode ter sido excluída." action={{ label: 'Fechar', onPress: () => router.back() }} />;
    return <VaccineDoseForm memberId={memberId} dose={dose} onSaved={() => router.back()} />;
  })();

  return (
    <HueProvider hue={hue}>
      <Screen testID="new-vaccine-dose-screen" presentation="sheet" heading={{ title }} contentContainerStyle={{ borderTopWidth: 4, borderTopColor: hue.tab }}>
        {doseId ? <Stack.Screen options={{ title }} /> : null}
        {body}
      </Screen>
    </HueProvider>
  );
}
