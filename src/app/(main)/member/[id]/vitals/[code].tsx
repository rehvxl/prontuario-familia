import { Stack } from 'expo-router';
import { MemberVitalsScreen } from '@/screens/member-vitals';

/** Voltar nomeado na própria rota, para não herdar "(tabs)" (BUG-03). */
export default function MemberVitalsRoute() {
  return (
    <>
      <MemberVitalsScreen />
      <Stack.Screen.BackButton displayMode="minimal">Voltar</Stack.Screen.BackButton>
    </>
  );
}
