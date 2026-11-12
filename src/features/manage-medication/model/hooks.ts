import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { medicationKeys, useMedicationRepository, type Medication, type NewMedication } from '@/entities/medication';
import { validateEndOn } from '../domain/medication-input';

function invalidate(queryClient: QueryClient, m: Medication) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: medicationKeys.byMember(m.memberId) }),
    queryClient.invalidateQueries({ queryKey: medicationKeys.byFamily(m.familyId) }),
  ]);
}

/** Entrada já montada por `buildMedicationInput`. */
export function useAddMedication() {
  const repo = useMedicationRepository();
  const queryClient = useQueryClient();
  return useMutation<Medication, Error, NewMedication>({
    mutationFn: async (input) => (await repo.createMany([input]))[0]!,
    onSuccess: (m) => invalidate(queryClient, m),
  });
}

/** F4.4: grava o fim de uso (o item passa a "Anteriores"); F4.5 recusa fim antes do início. */
export function useEndMedication() {
  const repo = useMedicationRepository();
  const queryClient = useQueryClient();
  return useMutation<Medication, Error, { medication: Medication; endOn: string }>({
    mutationFn: async ({ medication, endOn }) => repo.update(medication.id, { endOn: validateEndOn(medication.startOn, endOn) }),
    onSuccess: (m) => invalidate(queryClient, m),
  });
}

/** Recebe o item inteiro para invalidar as consultas da pessoa e da família. */
export function useDeleteMedication() {
  const repo = useMedicationRepository();
  const queryClient = useQueryClient();
  return useMutation<void, Error, Medication>({
    mutationFn: (m) => repo.remove(m.id),
    onSuccess: (_void, m) => invalidate(queryClient, m),
  });
}
