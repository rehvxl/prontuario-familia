import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recordKeys, useHealthRecordRepository } from '@/entities/health-record';
import { deleteRecord } from '../domain/delete-record';

/** Exclui o registro e atualiza linha do tempo e busca (o detalhe excluído sai do cache). */
export function useDeleteRecord() {
  const records = useHealthRecordRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => deleteRecord({ records }, recordId),
    onSuccess: async (_, recordId) => {
      queryClient.removeQueries({ queryKey: recordKeys.detail(recordId) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: recordKeys.timelines }),
        queryClient.invalidateQueries({ queryKey: recordKeys.searches }),
      ]);
    },
  });
}
