import { Stack } from 'expo-router';

/** Stack da aba "Família": cabeçalho nativo com título grande (sem cor fixa: o iOS 26 aplica o vidro). */
export default function FamilyLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitle: true, headerLargeTitleShadowVisible: false, headerTransparent: process.env.EXPO_OS === 'ios' }}>
      <Stack.Screen name="index" options={{ title: 'Família' }} />
    </Stack>
  );
}
