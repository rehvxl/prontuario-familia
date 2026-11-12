import { Stack } from 'expo-router';
import { MemberVaccinesScreen } from '@/screens/member-vaccines';

/** Voltar nomeado na própria rota, para não herdar "(tabs)" (BUG-03). */
export default function MemberVaccinesRoute() {
  return (
    <>
      <MemberVaccinesScreen />
      <Stack.Screen.BackButton displayMode="minimal">Voltar</Stack.Screen.BackButton>
    </>
  );
}
