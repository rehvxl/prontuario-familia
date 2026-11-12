import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemberMeasurements } from '@/entities/measurement';
import { LabResultForm } from '@/features/add-measurement';
import type { ReactNode } from 'react';
import { EmptyState, HueProvider, LoadErrorState, Screen, Spinner, categoricalIndexFor, useTheme, type ScreenProps } from '@/shared/ui';

/**
 * Novo resultado de exame manual (spec F2.5, F2.6; formSheet `measurement/new?memberId=`). Com
 * `measurementId`, a mesma folha edita um resultado existente (F2.9).
 */
export function NewMeasurementScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ memberId?: string; measurementId?: string }>();
  const memberId = typeof params.memberId === 'string' ? params.memberId : '';
  const measurementId = typeof params.measurementId === 'string' ? params.measurementId : undefined;
  const measurements = useMemberMeasurements(measurementId ? memberId : '');
  const editing = measurementId ? measurements.data?.find((m) => m.id === measurementId) : undefined;
  const theme = useTheme();
  // v4: folha simples com o filete da aba da pessoa no topo; os controles seguem a tinta dela.
  const hue = theme.personBoard(categoricalIndexFor(memberId));
  const sheet = (children: ReactNode, props: Pick<ScreenProps, 'scroll' | 'testID'> = { scroll: false }) => (
    <HueProvider hue={hue}>
      <Screen presentation="sheet" {...props} contentContainerStyle={{ borderTopWidth: 4, borderTopColor: hue.tab }}>
        {children}
      </Screen>
    </HueProvider>
  );

  if (!memberId) {
    return sheet(<EmptyState icon="person" title="Pessoa não encontrada" message="Volte e escolha de quem é o resultado." action={{ label: 'Voltar', onPress: () => router.back() }} />);
  }
  if (measurementId && measurements.isPending) {
    return sheet(<Spinner fill label="Carregando" />);
  }
  if (measurementId && measurements.isError) {
    return sheet(<LoadErrorState onRetry={() => void measurements.refetch()} />);
  }
  if (measurementId && !editing) {
    return sheet(<EmptyState icon="file" title="Resultado não encontrado" message="Ele pode ter sido excluído." action={{ label: 'Voltar', onPress: () => router.back() }} />);
  }

  return sheet(
    <>
      {editing ? <Stack.Screen options={{ title: 'Editar resultado' }} /> : null}
      <LabResultForm memberId={memberId} measurement={editing} onSaved={() => router.back()} />
    </>,
    { testID: 'new-measurement-screen' },
  );
}
