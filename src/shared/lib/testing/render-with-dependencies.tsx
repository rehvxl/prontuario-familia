import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DependencyProvider, type DependencyMap } from '../di';

/** Wrapper de testes de hooks: DI com `dependencies` + QueryClient novo (sem retry nem cache entre testes). */
export function renderWithDependencies(dependencies: DependencyMap) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children?: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <DependencyProvider dependencies={dependencies}>{children}</DependencyProvider>
    </QueryClientProvider>
  );
  return { queryClient, wrapper };
}
