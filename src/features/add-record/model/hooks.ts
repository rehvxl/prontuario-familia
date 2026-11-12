import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recordKeys, useAttachmentStorage, useHealthRecordRepository } from '@/entities/health-record';
import { measurementKeys, useMeasurementRepository } from '@/entities/measurement';
import { medicationKeys, useMedicationRepository } from '@/entities/medication';
import { useVaccineDoseRepository, vaccineKeys } from '@/entities/vaccine';
import { addRecord, type AddRecordInput } from '../domain/add-record';

/** Cria o registro com anexos (e os itens de saúde confirmados) e invalida a linha do tempo da pessoa e as buscas. */
export function useAddRecord() {
  const records = useHealthRecordRepository();
  const storage = useAttachmentStorage();
  const measurements = useMeasurementRepository();
  const vaccineDoses = useVaccineDoseRepository();
  const medications = useMedicationRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddRecordInput) => addRecord({ records, storage, measurements, vaccineDoses, medications }, input),
    onSuccess: (record, input) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: recordKeys.timeline(record.familyId, record.memberId) }),
        queryClient.invalidateQueries({ queryKey: recordKeys.searches }),
        queryClient.invalidateQueries({ queryKey: recordKeys.counts(record.familyId) }),
        ...(input.healthData
          ? [measurementKeys.all, vaccineKeys.all, medicationKeys.all].map((queryKey) => queryClient.invalidateQueries({ queryKey }))
          : []),
      ]),
  });
}
