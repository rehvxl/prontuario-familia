import { Stack } from 'expo-router';
import { headerOptions, useTheme } from '@/shared/ui';

export const unstable_settings = { anchor: 'welcome' };

export default function OnboardingLayout() {
  const theme = useTheme();
  return (
    <Stack screenOptions={headerOptions(theme, { largeTitle: false, transparent: true })}>
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="consent" options={{ title: '', headerBackTitle: 'Voltar' }} />
    </Stack>
  );
}
