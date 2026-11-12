import { act, renderHook } from '@testing-library/react-native';
import { DEPENDENCY_KEYS, LOCAL_COLLECTIONS } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { createLocalHealthRecordRepository, recordKeys } from '@/entities/health-record';
import { measurementKeys } from '@/entities/measurement';
import { medicationKeys } from '@/entities/medication';
import { vaccineKeys } from '@/entities/vaccine';
import { useDeleteRecord } from './hooks';

describe('useDeleteRecord', () => {
  it('apaga os itens ligados em cascata e invalida medições, vacinas, medicamentos e a linha do tempo', async () => {
    const db = createMemoryDb();
    const records = createLocalHealthRecordRepository(db);
    const record = await records.create({
      familyId: 'f1', memberId: 'm1', type: 'exam', title: 'Hemograma', date: '2026-10-01', location: null, professional: null, notes: null,
    });
    await db.put(LOCAL_COLLECTIONS.measurements, 'x1', { id: 'x1', memberId: 'm1', sourceRecordId: record.id });
    const { wrapper, queryClient } = renderWithDependencies({ [DEPENDENCY_KEYS.records]: records });
    const keys = [
      recordKeys.timeline('f1', 'm1'),
      measurementKeys.bySource(record.id),
      vaccineKeys.byMember('m1'),
      medicationKeys.byMember('m1'),
    ];
    for (const key of keys) queryClient.setQueryData(key, []);
    const { result } = await renderHook(() => useDeleteRecord(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(record.id);
    });

    expect(await db.list(LOCAL_COLLECTIONS.measurements)).toEqual([]);
    for (const key of keys) expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
  });
});
