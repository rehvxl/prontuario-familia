import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { measurementKeys, useMeasurementRepository, type Measurement, type MeasurementChanges, type NewMeasurement } from '@/entities/measurement';

/** Lista da pessoa, painel da família e itens do documento de origem (A15). */
function invalidate(queryClient: QueryClient, m: Measurement) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: measurementKeys.byMember(m.memberId) }),
    queryClient.invalidateQueries({ queryKey: measurementKeys.byFamily(m.familyId) }),
    m.sourceRecordId ? queryClient.invalidateQueries({ queryKey: measurementKeys.bySource(m.sourceRecordId) }) : null,
  ]);
}

/** Entrada já validada (`validateLabInput` ou `validateVitalInput`). */
export function useAddMeasurement() {
  const repo = useMeasurementRepository();
  const queryClient = useQueryClient();
  return useMutation<Measurement, Error, NewMeasurement>({
    mutationFn: async (input) => (await repo.createMany([input]))[0]!,
    onSuccess: (m) => invalidate(queryClient, m),
  });
}

export function useUpdateMeasurement() {
  const repo = useMeasurementRepository();
  const queryClient = useQueryClient();
  return useMutation<Measurement, Error, { id: string; changes: MeasurementChanges }>({
    mutationFn: ({ id, changes }) => repo.update(id, changes),
    onSuccess: (m) => invalidate(queryClient, m),
  });
}

/** Recebe o item inteiro para invalidar as consultas da pessoa e do documento de origem. */
export function useDeleteMeasurement() {
  const repo = useMeasurementRepository();
  const queryClient = useQueryClient();
  return useMutation<void, Error, Measurement>({
    mutationFn: (m) => repo.remove(m.id),
    onSuccess: (_void, m) => invalidate(queryClient, m),
  });
}
