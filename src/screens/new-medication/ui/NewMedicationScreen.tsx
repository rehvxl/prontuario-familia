import { useLocalSearchParams, useRouter } from 'expo-router';
import { MedicationForm } from '@/features/manage-medication';
import { HueProvider, Screen, categoricalIndexFor, useTheme } from '@/shared/ui';

/** Adicionar medicamento (spec F4.3; formSheet medication/new?memberId=). Salvou → fecha a folha. */
export function NewMedicationScreen() {
  const router = useRouter();
  const { memberId } = useLocalSearchParams<{ memberId?: string }>();
  const id = typeof memberId === 'string' ? memberId : '';
  const theme = useTheme();
  // v4: folha simples com o filete da aba da pessoa no topo; os controles seguem a tinta dela.
  const hue = theme.personBoard(categoricalIndexFor(id));
  return (
    <HueProvider hue={hue}>
      <Screen testID="new-medication-screen" presentation="sheet" contentContainerStyle={{ borderTopWidth: 4, borderTopColor: hue.tab }}>
        <MedicationForm memberId={id} onSaved={() => router.back()} />
      </Screen>
    </HueProvider>
  );
}
