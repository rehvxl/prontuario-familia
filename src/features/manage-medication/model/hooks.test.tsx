import { act, renderHook, waitFor } from '@testing-library/react-native';
import { DEPENDENCY_KEYS, LOCAL_COLLECTIONS } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { createLocalMedicationRepository, medicationKeys, medicationStatus, useMemberMedications } from '@/entities/medication';
import { buildMedicationInput } from '../domain/medication-input';
import { useAddMedication, useDeleteMedication, useEndMedication } from './hooks';

async function setup() {
  const db = createMemoryDb();
  await db.put(LOCAL_COLLECTIONS.members, 'm1', { id: 'm1', familyId: 'f1' });
  const repo = createLocalMedicationRepository(db);
  const { wrapper, queryClient } = renderWithDependencies({ [DEPENDENCY_KEYS.medications]: repo });
  return { wrapper, queryClient };
}

const losartana = buildMedicationInput({ familyId: 'f1', memberId: 'm1', name: 'Losartana', dosage: '50 mg', startOn: '2026-01-10', plan: { kind: 'continuous' } });

describe('manage-medication hooks', () => {
  it('adicionar, encerrar (vai para Anteriores) e excluir atualizam a lista', async () => {
    const { wrapper } = await setup();
    const { result } = await renderHook(
      () => ({ list: useMemberMedications('m1'), add: useAddMedication(), end: useEndMedication(), remove: useDeleteMedication() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.list.data).toEqual([]));

    await act(async () => {
      await result.current.add.mutateAsync(losartana);
    });
    await waitFor(() => expect(result.current.list.data).toHaveLength(1));
    const added = result.current.list.data![0]!;
    expect(medicationStatus(added, '2026-11-11')).toBe('active');

    await act(async () => {
      await result.current.end.mutateAsync({ medication: added, endOn: '2026-11-10' });
    });
    await waitFor(() => expect(result.current.list.data?.[0]?.endOn).toBe('2026-11-10'));
    expect(medicationStatus(result.current.list.data![0]!, '2026-11-11')).toBe('ended');

    await act(async () => {
      await result.current.remove.mutateAsync(result.current.list.data![0]!);
    });
    await waitFor(() => expect(result.current.list.data).toEqual([]));
  });

  it('F4.5: encerrar antes do início não grava nem invalida', async () => {
    const { wrapper, queryClient } = await setup();
    const { result } = await renderHook(() => ({ add: useAddMedication(), end: useEndMedication() }), { wrapper });
    let created: Awaited<ReturnType<typeof result.current.add.mutateAsync>> | undefined;
    await act(async () => {
      created = await result.current.add.mutateAsync(losartana);
    });
    queryClient.setQueryData(medicationKeys.byMember('m1'), [created]);
    await act(async () => {
      await expect(result.current.end.mutateAsync({ medication: created!, endOn: '2026-01-09' })).rejects.toMatchObject({
        code: 'medication/end-before-start',
        message: 'A data de término precisa ser igual ou posterior ao início.',
      });
    });
    expect(queryClient.getQueryState(medicationKeys.byMember('m1'))?.isInvalidated).toBe(false);
  });

  it('invalida a pessoa e a família, e não outras pessoas', async () => {
    const { wrapper, queryClient } = await setup();
    for (const key of [medicationKeys.byMember('m1'), medicationKeys.byMember('m2'), medicationKeys.byFamily('f1')]) queryClient.setQueryData(key, []);
    const { result } = await renderHook(() => useAddMedication(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(losartana);
    });
    expect(queryClient.getQueryState(medicationKeys.byMember('m1'))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(medicationKeys.byFamily('f1'))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(medicationKeys.byMember('m2'))?.isInvalidated).toBe(false);
  });
});
