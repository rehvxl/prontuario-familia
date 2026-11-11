import { Stack } from 'expo-router';
import { headerOptions, useTheme } from '@/shared/ui';

export const unstable_settings = { anchor: 'sign-in' };

export default function AuthLayout() {
  const theme = useTheme();
  return (
    <Stack screenOptions={headerOptions(theme, { largeTitle: false, transparent: true })}>
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="verify" options={{ title: '', headerBackTitle: 'Voltar' }} />
    </Stack>
  );
}
