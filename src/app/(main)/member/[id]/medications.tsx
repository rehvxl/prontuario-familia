import { Stack } from 'expo-router';
import { MemberMedicationsScreen } from '@/screens/member-medications';

/** Voltar nomeado na própria rota, para não herdar "(tabs)" (BUG-03). */
export default function MemberMedicationsRoute() {
  return (
    <>
      <MemberMedicationsScreen />
      <Stack.Screen.BackButton displayMode="minimal">Voltar</Stack.Screen.BackButton>
    </>
  );
}
