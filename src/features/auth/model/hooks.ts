import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clearEmergencyReadCache } from '@/entities/emergency-card';
import { sessionKeys, useAuthGateway, type AuthUser } from '@/entities/session';
import { requestEmailCode, signInWithApple, signInWithGoogle, signOut, verifyEmailCode } from '../domain/auth';

/** Envia o código por e-mail. `data` = e-mail normalizado. */
export function useRequestEmailCode() {
  const auth = useAuthGateway();
  return useMutation({ mutationFn: (email: string) => requestEmailCode({ auth }, email) });
}

function useSignedInMutation<V>(run: (variables: V) => Promise<AuthUser>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: async (user) => {
      // Uma leitura da sessão ainda em voo não pode sobrescrever o usuário que acabou de entrar.
      await queryClient.cancelQueries({ queryKey: sessionKeys.user });
      // Troca de conta: nada do usuário anterior pode ficar em cache.
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' });
      queryClient.setQueryData(sessionKeys.user, user);
    },
  });
}

export function useVerifyEmailCode() {
  const auth = useAuthGateway();
  return useSignedInMutation((input: { email: string; code: string }) => verifyEmailCode({ auth }, input));
}

export function useSignInWithApple() {
  const auth = useAuthGateway();
  return useSignedInMutation((_: void) => signInWithApple({ auth }));
}

export function useSignInWithGoogle() {
  const auth = useAuthGateway();
  return useSignedInMutation((_: void) => signInWithGoogle({ auth }));
}

export function useSignOut() {
  const auth = useAuthGateway();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => signOut({ auth }),
    onMutate: () => {
      const user = queryClient.getQueryData<AuthUser | null>(sessionKeys.user);
      return { userId: user?.id ?? null };
    },
    onSuccess: (_data, _vars, context) => {
      if (context?.userId) void clearEmergencyReadCache(context.userId);
      queryClient.clear();
      queryClient.setQueryData(sessionKeys.user, null);
    },
  });
}
