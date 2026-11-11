import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionKeys, useAuthGateway } from '@/entities/session';
import { deleteAccount } from '../domain/delete-account';

/** Exclui a conta e os dados e zera todo o cache (a guarda de navegação leva o usuário ao início). */
export function useDeleteAccount() {
  const auth = useAuthGateway();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAccount({ auth }),
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(sessionKeys.user, null);
    },
  });
}
