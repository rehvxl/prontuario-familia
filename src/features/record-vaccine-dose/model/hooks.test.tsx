import { act, renderHook, waitFor } from '@testing-library/react-native';
import { DEPENDENCY_KEYS, LOCAL_COLLECTIONS } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import {
  createLocalVaccineDoseRepository,
  evaluateVaccines,
  useMemberVaccines,
  vaccineKeys,
  type VaccineDose,
} from '@/entities/vaccine';
import { useDeleteVaccineDose, useDismissVaccineRule, useRecordVaccineDose, useUndoDismissal, useUpdateVaccineDose } from './hooks';

async function setup() {
  const db = createMemoryDb();
  await db.put(LOCAL_COLLECTIONS.members, 'm1', { id: 'm1', familyId: 'f1' });
  const { wrapper, queryClient } = renderWithDependencies({ [DEPENDENCY_KEYS.vaccineDoses]: createLocalVaccineDoseRepository(db) });
  return { wrapper, queryClient };
}

const yellowFever = {
  familyId: 'f1',
  memberId: 'm1',
  vaccineCode: 'yellow_fever',
  vaccineName: null,
  doseKey: 'D1' as const,
  doseLabel: '',
  appliedOn: '2026-10-15',
  lot: null,
  location: null,
  sourceRecordId: null,
  origin: 'manual' as const,
};

function useVaccines() {
  return {
    query: useMemberVaccines('m1'),
    record: useRecordVaccineDose(),
    update: useUpdateVaccineDose(),
    remove: useDeleteVaccineDose(),
    dismiss: useDismissVaccineRule(),
    undo: useUndoDismissal(),
  };
}

const statusOf = (doses: VaccineDose[] | undefined, ruleId: string) =>
  evaluateVaccines({ birthDate: '2026-01-10', doses: doses ?? [], dismissals: [], today: '2026-11-11' }).calendar.find(
    (c) => c.rule.id === ruleId,
  )?.status;

describe('hooks de vacinas', () => {
  it('registrar dose recalcula a carteira na mesma tela (F3.6); editar e excluir também', async () => {
    const { wrapper } = await setup();
    const { result } = await renderHook(useVaccines, { wrapper });
    await waitFor(() => expect(result.current.query.data).toEqual({ doses: [], dismissals: [] }));
    expect(statusOf(result.current.query.data?.doses, 'yellow_fever_d1')).toBe('late');

    await act(async () => {
      await result.current.record.mutateAsync(yellowFever);
    });
    await waitFor(() => expect(result.current.query.data?.doses).toHaveLength(1));
    const saved = result.current.query.data!.doses[0]!;
    expect(saved.doseLabel).toBe('1ª dose');
    expect(statusOf(result.current.query.data?.doses, 'yellow_fever_d1')).toBe('applied');

    await act(async () => {
      await result.current.update.mutateAsync({ dose: saved, changes: { appliedOn: null, lot: 'AB12' } });
    });
    await waitFor(() => expect(result.current.query.data?.doses[0]).toMatchObject({ appliedOn: null, lot: 'AB12' }));

    await act(async () => {
      await result.current.remove.mutateAsync(result.current.query.data!.doses[0]!);
    });
    await waitFor(() => expect(result.current.query.data?.doses).toEqual([]));
  });

  it('"Não se aplica" e "Desfazer" refletem nas dispensas da pessoa', async () => {
    const { wrapper } = await setup();
    const { result } = await renderHook(useVaccines, { wrapper });
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    await act(async () => {
      await result.current.dismiss.mutateAsync({ familyId: 'f1', memberId: 'm1', ruleId: 'varicella_d1', reason: 'had_disease', note: null });
    });
    await waitFor(() => expect(result.current.query.data?.dismissals.map((d) => d.ruleId)).toEqual(['varicella_d1']));

    await act(async () => {
      await result.current.undo.mutateAsync(result.current.query.data!.dismissals[0]!);
    });
    await waitFor(() => expect(result.current.query.data?.dismissals).toEqual([]));
  });

  it('invalida as consultas de vacinas da família e dados inválidos chegam como erro de domínio', async () => {
    const { wrapper, queryClient } = await setup();
    queryClient.setQueryData(vaccineKeys.byFamily('f1'), []);
    const { result } = await renderHook(useRecordVaccineDose, { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ ...yellowFever, vaccineCode: 'other' })).rejects.toMatchObject({ code: 'vaccine/missing-name' });
    });
    expect(queryClient.getQueryState(vaccineKeys.byFamily('f1'))?.isInvalidated).toBe(false);

    await act(async () => {
      await result.current.mutateAsync(yellowFever);
    });
    expect(queryClient.getQueryState(vaccineKeys.byFamily('f1'))?.isInvalidated).toBe(true);
  });
});
