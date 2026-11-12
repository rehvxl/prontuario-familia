import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import {
  useVaccineDoseRepository,
  vaccineKeys,
  type NewVaccineDose,
  type NewVaccineRuleDismissal,
  type VaccineDose,
  type VaccineDoseChanges,
  type VaccineRuleDismissal,
} from '@/entities/vaccine';
import { validateDismissalInput, validateDoseInput } from '../domain/validate';

/** Qualquer mudança refaz as consultas de vacinas (F3.6: pendências recalculadas na mesma tela). */
function useInvalidateVaccines() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: vaccineKeys.all });
}

export function useRecordVaccineDose(): UseMutationResult<VaccineDose, Error, NewVaccineDose> {
  const repo = useVaccineDoseRepository();
  const invalidate = useInvalidateVaccines();
  return useMutation({
    mutationFn: async (input: NewVaccineDose) => {
      const [created] = await repo.createMany([validateDoseInput(input)]);
      if (!created) throw new Error('Nenhuma dose foi salva.');
      return created;
    },
    onSuccess: invalidate,
  });
}

/** Edição da dose (L8: mesmo padrão da F2.9). Valida a dose inteira já com as mudanças. */
export function useUpdateVaccineDose(): UseMutationResult<VaccineDose, Error, { dose: VaccineDose; changes: VaccineDoseChanges }> {
  const repo = useVaccineDoseRepository();
  const invalidate = useInvalidateVaccines();
  return useMutation({
    mutationFn: ({ dose, changes }: { dose: VaccineDose; changes: VaccineDoseChanges }) => {
      const valid = validateDoseInput({ ...dose, ...changes });
      const { vaccineCode, vaccineName, doseKey, doseLabel, appliedOn, lot, location } = valid;
      return repo.update(dose.id, { vaccineCode, vaccineName, doseKey, doseLabel, appliedOn, lot, location });
    },
    onSuccess: invalidate,
  });
}

/** Exclusão da dose (a tela confirma antes com a ConfirmSheet). */
export function useDeleteVaccineDose(): UseMutationResult<void, Error, VaccineDose> {
  const repo = useVaccineDoseRepository();
  const invalidate = useInvalidateVaccines();
  return useMutation({ mutationFn: (dose: VaccineDose) => repo.remove(dose.id), onSuccess: invalidate });
}

export function useDismissVaccineRule(): UseMutationResult<VaccineRuleDismissal, Error, NewVaccineRuleDismissal> {
  const repo = useVaccineDoseRepository();
  const invalidate = useInvalidateVaccines();
  return useMutation({
    mutationFn: (input: NewVaccineRuleDismissal) => repo.dismiss(validateDismissalInput(input)),
    onSuccess: invalidate,
  });
}

/** Recebe a dispensa inteira para invalidar as consultas da pessoa. */
export function useUndoDismissal(): UseMutationResult<void, Error, VaccineRuleDismissal> {
  const repo = useVaccineDoseRepository();
  const invalidate = useInvalidateVaccines();
  return useMutation({ mutationFn: (dismissal: VaccineRuleDismissal) => repo.undismiss(dismissal.id), onSuccess: invalidate });
}
