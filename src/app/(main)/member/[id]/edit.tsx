import { Stack } from 'expo-router';
import { EditMemberScreen } from '@/screens/manage-member';

/**
 * Nomeia o botão voltar na própria rota. Sem isto ele herda o título da rota-pai "(tabs)" e o leitor de tela
 * anuncia "(tabs)" (BUG-03).
 */
export default function EditMemberRoute() {
  return (
    <>
      <EditMemberScreen />
      <Stack.Screen.BackButton displayMode="minimal">Voltar</Stack.Screen.BackButton>
    </>
  );
}
