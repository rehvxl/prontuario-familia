import { renderHook, waitFor } from '@testing-library/react-native';
import { DEPENDENCY_KEYS, LOCAL_COLLECTIONS, LOCAL_SESSION_ID, type LocalSessionDoc } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { createLocalHealthRecordRepository } from '@/entities/health-record';
import { useSearchRecords } from './hooks';

async function setup() {
  const db = createMemoryDb();
  await db.put<LocalSessionDoc>(LOCAL_COLLECTIONS.session, LOCAL_SESSION_ID, { userId: 'u1' });
  const records = createLocalHealthRecordRepository(db);
  const base = { familyId: 'f1', memberId: 'm1', location: null, professional: null, notes: null };
  await records.create({ ...base, type: 'exam', title: 'Ressonância do joelho', date: '2026-10-01' });
  await records.create({ ...base, type: 'vaccine', title: 'Vacina da gripe', date: '2026-05-01' });
  const { wrapper } = renderWithDependencies({ [DEPENDENCY_KEYS.records]: records });
  return { wrapper };
}

describe('useSearchRecords', () => {
  it('não consulta com menos de 2 caracteres nem sem filtro', async () => {
    const { wrapper } = await setup();
    const short = await renderHook(() => useSearchRecords({ familyId: 'f1', text: 'j' }), { wrapper });
    const none = await renderHook(() => useSearchRecords({ familyId: 'f1' }), { wrapper });
    expect(short.result.current.fetchStatus).toBe('idle');
    expect(none.result.current.fetchStatus).toBe('idle');
    expect(short.result.current.data).toBeUndefined();
  });

  it('acha por texto sem diferenciar acento e caixa', async () => {
    const { wrapper } = await setup();
    const { result } = await renderHook(() => useSearchRecords({ familyId: 'f1', text: 'RESSONANCIA' }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((r) => r.title)).toEqual(['Ressonância do joelho']);
  });

  it('filtra só por tipo', async () => {
    const { wrapper } = await setup();
    const { result } = await renderHook(() => useSearchRecords({ familyId: 'f1', types: ['vaccine'] }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((r) => r.title)).toEqual(['Vacina da gripe']);
  });
});
