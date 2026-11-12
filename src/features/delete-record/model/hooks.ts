import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recordKeys, useHealthRecordRepository } from '@/entities/health-record';
import { measurementKeys } from '@/entities/measurement';
import { medicationKeys } from '@/entities/medication';
import { vaccineKeys } from '@/entities/vaccine';
import { deleteRecord } from '../domain/delete-record';

/**
 * Exclui o registro e atualiza linha do tempo e busca (o detalhe excluído sai do cache).
 * Os itens de saúde ligados saem em cascata (A15), então as consultas de medições, vacinas e medicamentos também.
 */
export function useDeleteRecord() {
  const records = useHealthRecordRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => deleteRecord({ records }, recordId),
    onSuccess: async (_, recordId) => {
      queryClient.removeQueries({ queryKey: recordKeys.detail(recordId) });
      await Promise.all(
        [recordKeys.timelines, recordKeys.searches, recordKeys.allCounts, measurementKeys.all, vaccineKeys.all, medicationKeys.all].map(
          (queryKey) => queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
}
