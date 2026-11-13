import { Stack } from 'expo-router';
import { useContainer } from '@/application';
import { EmergencyCardScreen } from '@/screens/emergency-card';

/** Voltar nomeado na própria rota, para não herdar "(tabs)". */
export default function EmergencyCardRoute() {
  return (
    <>
      <EmergencyCardScreen demo={useContainer().mode === 'demo'} />
      <Stack.Screen.BackButton displayMode="minimal">Voltar</Stack.Screen.BackButton>
    </>
  );
}
