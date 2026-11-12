import { act, renderHook, waitFor } from '@testing-library/react-native';
import { DEPENDENCY_KEYS, LOCAL_COLLECTIONS, LOCAL_SESSION_ID, clearLocalFiles, type LocalSessionDoc } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import {
  createLocalAttachmentStorage,
  createLocalHealthRecordRepository,
  recordKeys,
  useMemberTimeline,
} from '@/entities/health-record';
import { createLocalMeasurementRepository, measurementKeys } from '@/entities/measurement';
import { createLocalMedicationRepository, medicationKeys } from '@/entities/medication';
import { createLocalVaccineDoseRepository, vaccineKeys } from '@/entities/vaccine';
import { useAddRecord } from './hooks';

async function setup() {
  clearLocalFiles();
  const db = createMemoryDb();
  await db.put<LocalSessionDoc>(LOCAL_COLLECTIONS.session, LOCAL_SESSION_ID, { userId: 'u1' });
  await db.put(LOCAL_COLLECTIONS.members, 'm1', { id: 'm1', familyId: 'f1', fullName: 'Carlos Souza' });
  const records = createLocalHealthRecordRepository(db);
  const storage = createLocalAttachmentStorage();
  const measurements = createLocalMeasurementRepository(db);
  const { wrapper, queryClient } = renderWithDependencies({
    [DEPENDENCY_KEYS.records]: records,
    [DEPENDENCY_KEYS.storage]: storage,
    [DEPENDENCY_KEYS.measurements]: measurements,
    [DEPENDENCY_KEYS.vaccineDoses]: createLocalVaccineDoseRepository(db),
    [DEPENDENCY_KEYS.medications]: createLocalMedicationRepository(db),
  });
  return { wrapper, queryClient, records, measurements };
}

const input = (over = {}) => ({
  familyId: 'f1',
  memberId: 'm1',
  type: 'exam' as const,
  title: 'Hemograma',
  date: '2026-10-01',
  files: [],
  ...over,
});

describe('useAddRecord', () => {
  it('atualiza a linha do tempo da pessoa depois de adicionar', async () => {
    const { wrapper } = await setup();
    const { result } = await renderHook(() => ({ timeline: useMemberTimeline('f1', 'm1'), add: useAddRecord() }), { wrapper });
    await waitFor(() => expect(result.current.timeline.isSuccess).toBe(true));
    expect(result.current.timeline.data).toEqual([]);

    await act(async () => {
      await result.current.add.mutateAsync(input());
    });
    await waitFor(() => expect(result.current.timeline.data).toHaveLength(1));
    expect(result.current.timeline.data?.[0]).toMatchObject({ month: '2026-10' });
    expect(result.current.timeline.data?.[0]?.records[0]?.title).toBe('Hemograma');
  });

  it('invalida só a linha do tempo da pessoa certa e todas as buscas', async () => {
    const { wrapper, queryClient } = await setup();
    queryClient.setQueryData(recordKeys.timeline('f1', 'm1'), []);
    queryClient.setQueryData(recordKeys.timeline('f1', 'm2'), []);
    queryClient.setQueryData(recordKeys.search('f1', { text: 'x' }), []);
    const { result } = await renderHook(() => useAddRecord(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(input());
    });

    expect(queryClient.getQueryState(recordKeys.timeline('f1', 'm1'))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(recordKeys.timeline('f1', 'm2'))?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(recordKeys.search('f1', { text: 'x' }))?.isInvalidated).toBe(true);
  });

  it('falha de validação não grava nem invalida nada', async () => {
    const { wrapper, queryClient, records } = await setup();
    queryClient.setQueryData(recordKeys.timeline('f1', 'm1'), []);
    const { result } = await renderHook(() => useAddRecord(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(input({ title: ' ' }))).rejects.toMatchObject({ code: 'record/missing-title' });
    });

    expect(await records.list('f1')).toEqual([]);
    expect(queryClient.getQueryState(recordKeys.timeline('f1', 'm1'))?.isInvalidated).toBe(false);
    await waitFor(() => expect(result.current.error).toMatchObject({ code: 'record/missing-title' }));
  });

  it('com healthData, grava os itens e invalida medições, vacinas e medicamentos', async () => {
    const { wrapper, queryClient, measurements } = await setup();
    const keys = [measurementKeys.byMember('m1'), vaccineKeys.byMember('m1'), medicationKeys.byMember('m1')];
    for (const key of keys) queryClient.setQueryData(key, []);
    const { result } = await renderHook(() => useAddRecord(), { wrapper });

    const healthData = {
      measurements: [
        {
          kind: 'lab' as const, code: 'hba1c', label: 'Hemoglobina glicada (HbA1c)', value: 7.4, value2: null, unit: '%',
          referenceLow: 4, referenceHigh: 5.6, referenceText: null, takenOn: '2026-10-01', takenAt: null, context: null, note: null,
        },
      ],
      vaccineDoses: [],
      medications: [],
    };
    let recordId = '';
    await act(async () => {
      recordId = (await result.current.mutateAsync(input({ healthData }))).id;
    });

    expect(await measurements.listBySourceRecord(recordId)).toEqual([expect.objectContaining({ code: 'hba1c', origin: 'ocr' })]);
    for (const key of keys) expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
  });

  it('sem healthData, não invalida as consultas de saúde', async () => {
    const { wrapper, queryClient } = await setup();
    queryClient.setQueryData(measurementKeys.byMember('m1'), []);
    const { result } = await renderHook(() => useAddRecord(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(input());
    });
    expect(queryClient.getQueryState(measurementKeys.byMember('m1'))?.isInvalidated).toBe(false);
  });
});
