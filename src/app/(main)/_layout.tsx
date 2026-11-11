import { Stack } from 'expo-router';
import { useTheme } from '@/shared/ui';

/**
 * Stack do app logado: abas nativas + telas empilhadas. Sem cor de fundo fixa nos cabeçalhos no iOS
 * (o iOS 26 desenha o vidro/Liquid Glass); no Android mantém a cor do tema.
 * "Novo registro" e "Nova pessoa" abrem como formSheet (folha nativa com detents).
 */
export default function MainLayout() {
  const theme = useTheme();
  const ios = process.env.EXPO_OS === 'ios';
  return (
    <Stack
      screenOptions={{
        headerTintColor: theme.colors.primary,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: theme.colors.background },
        ...(ios ? { headerTransparent: true } : { headerStyle: { backgroundColor: theme.colors.background }, headerShadowVisible: false }),
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="member/[id]/index" options={{ title: 'Linha do tempo', headerLargeTitle: true, headerLargeTitleShadowVisible: false }} />
      <Stack.Screen name="member/[id]/edit" options={{ title: 'Editar pessoa' }} />
      <Stack.Screen name="record/[id]" options={{ title: 'Registro' }} />
      <Stack.Screen
        name="member/new"
        options={{
          title: 'Nova pessoa',
          presentation: 'formSheet',
          sheetAllowedDetents: [0.8, 1],
          sheetGrabberVisible: true,
          headerTransparent: false,
        }}
      />
      <Stack.Screen
        name="record/new"
        options={{
          title: 'Novo registro',
          // Folha de página nativa (sem detents): o ScrollView não repinta quando um formSheet muda de detent (iOS 26).
          presentation: 'modal',
          headerTransparent: false,
        }}
      />
    </Stack>
  );
}
