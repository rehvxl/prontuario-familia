import { QueryClient } from '@tanstack/react-query';
import { isDomainError } from '@/shared/lib';

/** Padrões do app: erro de regra de negócio não adianta repetir; erro de rede tenta mais uma vez. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => !isDomainError(error) && failureCount < 1,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}
