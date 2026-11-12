import { Stack } from 'expo-router';
import { RecordDetailScreen } from '@/screens/record-detail';

/**
 * Nomeia o botão voltar na própria rota. Sem isto ele herda o título da rota-pai "(tabs)" e o leitor de tela
 * anuncia "(tabs)" (BUG-03).
 */
export default function RecordDetailRoute() {
  return (
    <>
      <RecordDetailScreen />
      <Stack.Screen.BackButton displayMode="minimal">Voltar</Stack.Screen.BackButton>
    </>
  );
}
