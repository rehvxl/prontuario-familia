import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '../domain/session';
import { useAuthGateway } from './dependencies';

export const sessionKeys = {
  user: ['session', 'user'] as const,
  providers: ['session', 'providers'] as const,
};

/**
 * Usuário logado (`null` = sem sessão). Mantém o cache em sincronia com `onAuthStateChange`
 * (login em outra tela, expiração do token, logout, exclusão de conta).
 */
export function useCurrentUser() {
  const auth = useAuthGateway();
  const queryClient = useQueryClient();
  useEffect(
    () => auth.onAuthStateChange((user: AuthUser | null) => queryClient.setQueryData(sessionKeys.user, user)),
    [auth, queryClient],
  );
  return useQuery({ queryKey: sessionKeys.user, queryFn: () => auth.getCurrentUser(), staleTime: Infinity });
}

/** Provedores sociais disponíveis neste aparelho/ambiente (para mostrar ou esconder os botões). */
export function useAuthProviders() {
  const auth = useAuthGateway();
  return useQuery({ queryKey: sessionKeys.providers, queryFn: () => auth.availableProviders(), staleTime: Infinity });
}
