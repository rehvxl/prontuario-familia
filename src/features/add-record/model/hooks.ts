import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recordKeys, useAttachmentStorage, useHealthRecordRepository } from '@/entities/health-record';
import { addRecord, type AddRecordInput } from '../domain/add-record';

/** Cria o registro com anexos e invalida a linha do tempo da pessoa e as buscas. */
export function useAddRecord() {
  const records = useHealthRecordRepository();
  const storage = useAttachmentStorage();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddRecordInput) => addRecord({ records, storage }, input),
    onSuccess: (record) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: recordKeys.timeline(record.familyId, record.memberId) }),
        queryClient.invalidateQueries({ queryKey: recordKeys.searches }),
        queryClient.invalidateQueries({ queryKey: recordKeys.counts(record.familyId) }),
      ]),
  });
}
