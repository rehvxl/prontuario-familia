import { Stack } from 'expo-router';
import { ExamSeriesScreen } from '@/screens/exam-series';

/** Voltar nomeado na própria rota, para não herdar "(tabs)" (BUG-03). */
export default function ExamSeriesRoute() {
  return (
    <>
      <ExamSeriesScreen />
      <Stack.Screen.BackButton displayMode="minimal">Voltar</Stack.Screen.BackButton>
    </>
  );
}
