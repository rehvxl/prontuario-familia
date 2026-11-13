import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clearEmergencyReadCache } from '@/entities/emergency-card';
import { sessionKeys, useAuthGateway, type AuthUser } from '@/entities/session';
import { deleteAccount } from '../domain/delete-account';

/** Exclui a conta e os dados e zera todo o cache (a guarda de navegação leva o usuário ao início). */
export function useDeleteAccount() {
  const auth = useAuthGateway();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAccount({ auth }),
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
