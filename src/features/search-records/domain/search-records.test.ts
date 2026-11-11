import type { HealthRecordRepository, RecordQuery } from '@/entities/health-record';
import { MIN_SEARCH_LENGTH, isSearchable, searchRecords } from './search-records';

function fakeRecords() {
  const calls: { familyId: string; query?: RecordQuery }[] = [];
  const repo: HealthRecordRepository = {
    list: async (familyId, query) => {
      calls.push({ familyId, query });
      return [];
    },
    getById: async () => null,
    create: async () => {
      throw new Error('não usado');
    },
    remove: async () => undefined,
    addAttachment: async () => {
      throw new Error('não usado');
    },
  };
  return { repo, calls };
}

describe('isSearchable', () => {
  it('exige 2+ caracteres de texto ou ao menos um tipo', () => {
    expect(MIN_SEARCH_LENGTH).toBe(2);
    expect(isSearchable({ text: 'ab' })).toBe(true);
    expect(isSearchable({ text: ' a ' })).toBe(false);
    expect(isSearchable({ text: '' })).toBe(false);
    expect(isSearchable({})).toBe(false);
    expect(isSearchable({ types: ['exam'] })).toBe(true);
    expect(isSearchable({ text: 'a', types: ['exam'] })).toBe(true);
  });
});

describe('searchRecords', () => {
  it('busca por texto aparado', async () => {
    const { repo, calls } = fakeRecords();
    await searchRecords({ records: repo }, { familyId: 'f1', text: '  joelho ' });
    expect(calls).toEqual([{ familyId: 'f1', query: { text: 'joelho' } }]);
  });

  it('combina texto, tipos e membro', async () => {
    const { repo, calls } = fakeRecords();
    await searchRecords({ records: repo }, { familyId: 'f1', text: 'ana', types: ['exam', 'result'], memberId: 'm1' });
    expect(calls[0]?.query).toEqual({ text: 'ana', types: ['exam', 'result'], memberId: 'm1' });
  });

  it('só tipos (sem texto) é uma busca válida', async () => {
    const { repo, calls } = fakeRecords();
    await searchRecords({ records: repo }, { familyId: 'f1', types: ['vaccine'] });
    expect(calls[0]?.query).toEqual({ types: ['vaccine'] });
  });

  it('texto de 1 caractere é erro e não consulta', async () => {
    const { repo, calls } = fakeRecords();
    await expect(searchRecords({ records: repo }, { familyId: 'f1', text: 'a' })).rejects.toMatchObject({ code: 'search/query-too-short' });
    expect(calls).toEqual([]);
  });

  it('sem critério devolve vazio sem consultar', async () => {
    const { repo, calls } = fakeRecords();
    expect(await searchRecords({ records: repo }, { familyId: 'f1', text: '   ', types: [] })).toEqual([]);
    expect(calls).toEqual([]);
  });
});
