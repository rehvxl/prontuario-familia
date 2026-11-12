import { act, renderHook, waitFor } from '@testing-library/react-native';
import { DEPENDENCY_KEYS, LOCAL_COLLECTIONS } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { createLocalMeasurementRepository, measurementKeys, useMemberMeasurements, type NewMeasurement } from '@/entities/measurement';
import { useAddMeasurement, useDeleteMeasurement, useUpdateMeasurement } from './hooks';

async function setup() {
  const db = createMemoryDb();
  await db.put(LOCAL_COLLECTIONS.members, 'm1', { id: 'm1', familyId: 'f1' });
  await db.put(LOCAL_COLLECTIONS.records, 'r1', { id: 'r1', familyId: 'f1', memberId: 'm1', attachments: [] });
  const repo = createLocalMeasurementRepository(db);
  const { wrapper, queryClient } = renderWithDependencies({ [DEPENDENCY_KEYS.measurements]: repo });
  return { wrapper, queryClient, repo };
}

const input = (over: Partial<NewMeasurement> = {}): NewMeasurement => ({
  familyId: 'f1',
  memberId: 'm1',
  kind: 'lab',
  code: 'hba1c',
  label: 'Hemoglobina glicada (HbA1c)',
  value: 6.1,
  value2: null,
  unit: '%',
  referenceLow: null,
  referenceHigh: 5.6,
  referenceText: null,
  takenOn: '2026-10-12',
  takenAt: null,
  context: null,
  note: null,
  sourceRecordId: 'r1',
  origin: 'manual',
  ...over,
});

describe('add-measurement hooks', () => {
  it('adicionar, editar e excluir atualizam a lista da pessoa', async () => {
    const { wrapper } = await setup();
    const { result } = await renderHook(
      () => ({ list: useMemberMeasurements('m1'), add: useAddMeasurement(), update: useUpdateMeasurement(), remove: useDeleteMeasurement() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.list.data).toEqual([]));

    let created: Awaited<ReturnType<typeof result.current.add.mutateAsync>> | undefined;
    await act(async () => {
      created = await result.current.add.mutateAsync(input());
    });
    expect(created).toMatchObject({ code: 'hba1c', value: 6.1 });
    await waitFor(() => expect(result.current.list.data).toHaveLength(1));

    await act(async () => {
      await result.current.update.mutateAsync({ id: created!.id, changes: { value: 5.4 } });
    });
    await waitFor(() => expect(result.current.list.data?.[0]?.value).toBe(5.4));

    await act(async () => {
      await result.current.remove.mutateAsync(result.current.list.data![0]!);
    });
    await waitFor(() => expect(result.current.list.data).toEqual([]));
  });

  it('invalida pessoa, família e documento de origem, e não outras pessoas', async () => {
    const { wrapper, queryClient } = await setup();
    for (const key of [measurementKeys.byMember('m1'), measurementKeys.byMember('m2'), measurementKeys.byFamily('f1'), measurementKeys.bySource('r1')]) {
      queryClient.setQueryData(key, []);
    }
    const { result } = await renderHook(() => useAddMeasurement(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(input());
    });
    const invalidated = (key: readonly unknown[]) => queryClient.getQueryState(key)?.isInvalidated;
    expect(invalidated(measurementKeys.byMember('m1'))).toBe(true);
    expect(invalidated(measurementKeys.byFamily('f1'))).toBe(true);
    expect(invalidated(measurementKeys.bySource('r1'))).toBe(true);
    expect(invalidated(measurementKeys.byMember('m2'))).toBe(false);
  });

  it('falha no repositório não invalida nada', async () => {
    const { wrapper, queryClient } = await setup();
    queryClient.setQueryData(measurementKeys.byMember('m1'), []);
    const { result } = await renderHook(() => useAddMeasurement(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync(input({ value2: 80 }))).rejects.toMatchObject({ code: 'measurement/invalid' });
    });
    expect(queryClient.getQueryState(measurementKeys.byMember('m1'))?.isInvalidated).toBe(false);
  });
});
