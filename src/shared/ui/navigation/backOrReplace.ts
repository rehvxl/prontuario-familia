import { Platform } from 'react-native';

/** O que o fechamento precisa do roteador. O `replace` fica tipado pelo destino de cada chamada. */
export interface CloseRouter<Href> {
  canGoBack(): boolean;
  back(): void;
  replace(href: Href): void;
}

/**
 * Fecha uma tela empilhada. Com histórico, `back()`.
 * Na web, URL direta ou recarregada deixa `canGoBack()` falso e `back()` não sai da tela:
 * aí a rota de origem entra com `replace`, sem empilhar.
 * No iOS e no Android o `back()` permanece, mesmo sem histórico.
 */
export function backOrReplace<Href>(router: CloseRouter<Href>, origin: Href): void {
  if (Platform.OS === 'web' && !router.canGoBack()) {
    router.replace(origin);
    return;
  }
  router.back();
}
