import { Stack } from 'expo-router';
import { headerOptions, useTheme } from '@/shared/ui';

/**
 * Stack da aba "Buscar": tela-raiz com o título no conteúdo (`Screen heading`). O cabeçalho nativo
 * nasce já sem título grande e transparente (vidro do sistema no iOS 26): ligar o título grande aqui e
 * desligar na tela deixava o espaço dele reservado acima do título (A2).
 */
export default function SearchLayout() {
  const theme = useTheme();
  return (
    <Stack screenOptions={headerOptions(theme, { contentTitle: true })}>
      <Stack.Screen name="index" options={{ title: 'Buscar' }} />
    </Stack>
  );
}
