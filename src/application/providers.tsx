import { createContext, useContext, useState, type ReactNode } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { env } from '@/shared/config';
import { DependencyProvider } from '@/shared/lib';
import { containerDependencies, createContainer, type AppContainer } from './container';
import { createQueryClient } from './query-client';

const ContainerContext = createContext<AppContainer | null>(null);

/** Registra o container no DI genérico (hooks de entities/features) e no contexto de `useContainer()`. */
export function ContainerProvider({ container, children }: { container: AppContainer; children?: ReactNode }) {
  const [dependencies] = useState(() => containerDependencies(container));
  return (
    <ContainerContext.Provider value={container}>
      <DependencyProvider dependencies={dependencies}>{children}</DependencyProvider>
    </ContainerContext.Provider>
  );
}

/** Container completo (modo, portas). Para telas basta usar os hooks de model/; isto é para `application`/guarda. */
export function useContainer(): AppContainer {
  const container = useContext(ContainerContext);
  if (!container) throw new Error('useContainer() usado fora de ContainerProvider.');
  return container;
}

/** Raiz de providers do app. Testes passam `container` e `queryClient` próprios. */
export function AppProviders({
  children,
  container,
  queryClient,
}: {
  children?: ReactNode;
  container?: AppContainer;
  queryClient?: QueryClient;
}) {
  const [resolvedContainer] = useState(() => container ?? createContainer(env));
  const [resolvedClient] = useState(() => queryClient ?? createQueryClient());
  return (
    <ContainerProvider container={resolvedContainer}>
      <QueryClientProvider client={resolvedClient}>{children}</QueryClientProvider>
    </ContainerProvider>
  );
}
