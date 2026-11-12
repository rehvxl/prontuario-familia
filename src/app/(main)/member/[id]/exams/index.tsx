import { Stack } from 'expo-router';
import { MemberExamsScreen } from '@/screens/member-exams';

/** Voltar nomeado na própria rota, para não herdar "(tabs)" (BUG-03). */
export default function MemberExamsRoute() {
  return (
    <>
      <MemberExamsScreen />
      <Stack.Screen.BackButton displayMode="minimal">Voltar</Stack.Screen.BackButton>
    </>
  );
}
