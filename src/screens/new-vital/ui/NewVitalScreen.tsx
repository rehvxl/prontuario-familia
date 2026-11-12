import { useLocalSearchParams, useRouter } from 'expo-router';
import { VITALS, type VitalCode } from '@/entities/measurement';
import { VitalEntryForm } from '@/features/add-measurement';
import { EmptyState, HueProvider, Screen, categoricalIndexFor, useTheme } from '@/shared/ui';

const isVitalCode = (v: unknown): v is VitalCode => VITALS.some((x) => x.code === v);

/** Registrar sinal vital (spec F5.1; formSheet vital/new?memberId=&kind=). O "Fechar" fica na rota. */
export function NewVitalScreen() {
  const router = useRouter();
  const { memberId, kind } = useLocalSearchParams<{ memberId?: string; kind?: string }>();
  const id = typeof memberId === 'string' ? memberId : '';
  const theme = useTheme();
  // v4: folha simples com o filete da aba da pessoa no topo; os controles seguem a tinta dela.
  const hue = theme.personBoard(categoricalIndexFor(id));
  return (
    <HueProvider hue={hue}>
      <Screen testID="new-vital-screen" presentation="sheet" contentContainerStyle={{ borderTopWidth: 4, borderTopColor: hue.tab }}>
        {id ? (
          <VitalEntryForm memberId={id} kind={isVitalCode(kind) ? kind : undefined} onSaved={() => router.back()} />
        ) : (
          <EmptyState icon="person" title="Pessoa não encontrada" message="Abra o sinal vital pela página da pessoa." action={{ label: 'Voltar', onPress: () => router.back() }} />
        )}
      </Screen>
    </HueProvider>
  );
}
