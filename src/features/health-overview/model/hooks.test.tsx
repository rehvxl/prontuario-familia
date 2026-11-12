import { act, renderHook, waitFor } from '@testing-library/react-native';
import { DEPENDENCY_KEYS, LOCAL_COLLECTIONS } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { createLocalHealthRecordRepository } from '@/entities/health-record';
import { createLocalMeasurementRepository, measurementKeys, type MeasurementRepository } from '@/entities/measurement';
import { createLocalMedicationRepository, type MedicationRepository } from '@/entities/medication';
import { createLocalMemberRepository } from '@/entities/member';
import { createLocalVaccineDoseRepository, vaccineKeys } from '@/entities/vaccine';
import { useFamilyAttention, useMemberHealthSummary, useRecordLinkedItems } from './hooks';

const hba1c = {
  kind: 'lab' as const, code: 'hba1c', label: 'Hemoglobina glicada', value: 7.4, value2: null, unit: '%',
  referenceLow: 4, referenceHigh: 5.6, referenceText: null, takenOn: '2026-10-12', takenAt: null, context: null, note: null,
};

async function setup(over: { medications?: Partial<MedicationRepository> } = {}) {
  const db = createMemoryDb();
  const membersRepo = createLocalMemberRepository(db);
  const carlos = await membersRepo.create({ familyId: 'f1', fullName: 'Carlos Souza', birthDate: '1996-01-01', relationship: 'self', sex: 'male' });
  const records = createLocalHealthRecordRepository(db);
  const record = await records.create({
    familyId: 'f1', memberId: carlos.id, type: 'exam', title: 'Laudo', date: '2026-10-12', location: null, professional: null, notes: null,
  });
  const measurements: MeasurementRepository = createLocalMeasurementRepository(db);
  const vaccineDoses = createLocalVaccineDoseRepository(db);
  const medications = { ...createLocalMedicationRepository(db), ...over.medications };
  const { wrapper, queryClient } = renderWithDependencies({
    [DEPENDENCY_KEYS.members]: membersRepo,
    [DEPENDENCY_KEYS.measurements]: measurements,
    [DEPENDENCY_KEYS.vaccineDoses]: vaccineDoses,
    [DEPENDENCY_KEYS.medications]: medications,
  });
  return { db, wrapper, queryClient, carlos, record, measurements, vaccineDoses, medications };
}

describe('useMemberHealthSummary', () => {
  it('uma seção com erro não derruba as outras (F6, estados)', async () => {
    const s = await setup({ medications: { listByMember: () => Promise.reject(new Error('fora do ar')) } });
    await s.measurements.createMany([{ ...hba1c, familyId: 'f1', memberId: s.carlos.id, sourceRecordId: null, origin: 'manual' }]);
    const { result } = await renderHook(() => useMemberHealthSummary(s.carlos.id), { wrapper: s.wrapper });

    await waitFor(() => expect(result.current.sections.medications.error).toBeTruthy());
    await waitFor(() => expect(result.current.sections.labs.isLoading).toBe(false));
    expect(result.current.sections.labs.error).toBeNull();
    expect(result.current.sections.vaccines.error).toBeNull();
    expect(result.current.summary?.recentLabs.map((l) => l.code)).toEqual(['hba1c']);
    expect(result.current.summary?.activeMedications).toEqual([]);
  });
});

describe('useFamilyAttention', () => {
  it('sem dado de saúde: hasHealthData false; depois de uma medição invalidada, recalcula sozinho', async () => {
    const s = await setup();
    const { result } = await renderHook(() => useFamilyAttention('f1'), { wrapper: s.wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.hasHealthData).toBe(false);
    expect(result.current.data?.vaccines.total).toBe(1);

    await s.measurements.createMany([{ ...hba1c, familyId: 'f1', memberId: s.carlos.id, sourceRecordId: null, origin: 'manual' }]);
    await act(async () => {
      await s.queryClient.invalidateQueries({ queryKey: measurementKeys.byFamily('f1') });
    });
    await waitFor(() => expect(result.current.data?.hasHealthData).toBe(true));
  });

  it('erro em uma das consultas vira erro do conjunto, e refetch tenta de novo', async () => {
    const s = await setup();
    let fail = true;
    const listByFamily = s.vaccineDoses.listByFamily;
    s.vaccineDoses.listByFamily = (familyId) => (fail ? Promise.reject(new Error('fora do ar')) : listByFamily(familyId));
    const { result } = await renderHook(() => useFamilyAttention('f1'), { wrapper: s.wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();

    fail = false;
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useRecordLinkedItems', () => {
  it('conta medições, doses e medicamentos ligados ao documento ({n} da A15), sem contar os manuais', async () => {
    const s = await setup();
    const link = { familyId: 'f1', memberId: s.carlos.id, sourceRecordId: s.record.id, origin: 'ocr' as const };
    await s.measurements.createMany([{ ...hba1c, ...link }, { ...hba1c, ...link, sourceRecordId: null, origin: 'manual' }]);
    await s.vaccineDoses.createMany([
      { ...link, vaccineCode: 'influenza', vaccineName: null, doseKey: 'ANUAL', doseLabel: 'Anual', appliedOn: '2026-04-15', lot: null, location: null },
    ]);
    await s.medications.createMany([
      { ...link, name: 'Amoxicilina', dosage: '500 mg', instructions: null, startOn: '2026-10-12', endOn: '2026-10-18' },
      { ...link, name: 'Dipirona', dosage: null, instructions: null, startOn: '2026-10-12', endOn: null },
    ]);

    const { result } = await renderHook(() => useRecordLinkedItems(s.record.id), { wrapper: s.wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.count).toBe(4);
    expect(result.current.data?.medications.map((m) => m.name).sort()).toEqual(['Amoxicilina', 'Dipirona']);
  });

  it('a invalidação ampla de vacinas também atualiza as doses do documento', async () => {
    const s = await setup();
    const { result } = await renderHook(() => useRecordLinkedItems(s.record.id), { wrapper: s.wrapper });
    await waitFor(() => expect(result.current.data?.count).toBe(0));

    await s.vaccineDoses.createMany([
      {
        familyId: 'f1', memberId: s.carlos.id, sourceRecordId: s.record.id, origin: 'ocr',
        vaccineCode: 'influenza', vaccineName: null, doseKey: 'ANUAL', doseLabel: 'Anual', appliedOn: '2026-04-15', lot: null, location: null,
      },
    ]);
    await act(async () => {
      await s.queryClient.invalidateQueries({ queryKey: vaccineKeys.all });
    });
    await waitFor(() => expect(result.current.data?.count).toBe(1));
    expect(await s.db.list(LOCAL_COLLECTIONS.vaccineDoses)).toHaveLength(1);
  });
});
