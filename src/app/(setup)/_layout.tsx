import { Stack } from 'expo-router';

export const unstable_settings = { anchor: 'family' };

/** Sem cabeçalho nativo: as telas pintam a divisória até a barra de status (`Screen board edges` com 'top'). */
export default function SetupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="family" />
      <Stack.Screen name="members" />
    </Stack>
  );
}
