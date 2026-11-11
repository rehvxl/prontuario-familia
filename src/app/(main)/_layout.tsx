import { Stack } from 'expo-router';
import { headerTitleColors, useTheme } from '@/shared/ui';

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
        ...headerTitleColors(theme),
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
          // Mesmo defeito do formSheet de "Novo registro" (corpo sem pintar no iOS 26.5): folha de página (modal).
          presentation: 'modal',
          headerTransparent: false,
        }}
      />
      <Stack.Screen
        name="record/new"
        options={{
          title: 'Novo registro',
          // formSheet (iOS 26.5, react-native-screens 4.30, Expo Go) monta os campos mas não os pinta: corpo vazio. Folha de página (modal) pinta.
          presentation: 'modal',
          headerTransparent: false,
        }}
      />
    </Stack>
  );
}
