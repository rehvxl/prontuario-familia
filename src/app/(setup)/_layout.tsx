import { Stack } from 'expo-router';
import { headerOptions, useTheme } from '@/shared/ui';

export const unstable_settings = { anchor: 'family' };

export default function SetupLayout() {
  const theme = useTheme();
  return (
    <Stack screenOptions={{ ...headerOptions(theme, { largeTitle: false, transparent: true }), headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="family" />
      <Stack.Screen name="members" />
    </Stack>
  );
}
