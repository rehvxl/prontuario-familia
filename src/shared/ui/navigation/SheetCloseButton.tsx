import Close from '@expo/material-symbols/close.xml';
import { Stack, useRouter } from 'expo-router';
import { Platform } from 'react-native';

export interface SheetCloseButtonProps {
  /** Padrão: `router.back()`. */
  onPress?: () => void;
}

/**
 * Botão "Fechar" à esquerda do cabeçalho das rotas de formulário (folha no iOS, modal no Android).
 * O `Stack.Toolbar.Button` do Android não aceita SF Symbol (sem ícone ele não aparece): lá vai o
 * `close` do Material Symbols, como asset XML.
 */
export function SheetCloseButton({ onPress }: SheetCloseButtonProps) {
  const router = useRouter();
  return (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button icon={Platform.OS === 'android' ? Close : 'xmark'} accessibilityLabel="Fechar" onPress={onPress ?? (() => router.back())} />
    </Stack.Toolbar>
  );
}
