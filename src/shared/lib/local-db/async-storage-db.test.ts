import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLocalDb } from './async-storage-db';

describe('createLocalDb (AsyncStorage)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('grava, lê, lista e remove documentos por coleção', async () => {
    const db = createLocalDb();
    await db.put('members', 'a', { id: 'a', name: 'Ana' });
    await db.put('members', 'b', { id: 'b', name: 'Bia' });
    await db.put('records', 'r1', { id: 'r1' });

    expect(await db.get('members', 'a')).toEqual({ id: 'a', name: 'Ana' });
    expect(await db.get('members', 'zzz')).toBeNull();
    expect(await db.list('members')).toHaveLength(2);

    await db.remove('members', 'a');
    expect(await db.list('members')).toEqual([{ id: 'b', name: 'Bia' }]);
    expect(await db.list('inexistente')).toEqual([]);
  });

  it('não perde escritas concorrentes na mesma coleção', async () => {
    const db = createLocalDb();
    await Promise.all(Array.from({ length: 20 }, (_, i) => db.put('c', `k${i}`, { i })));
    expect(await db.list('c')).toHaveLength(20);
  });

  it('dump devolve todas as coleções e clear apaga só as chaves do banco', async () => {
    const db = createLocalDb();
    await AsyncStorage.setItem('outra-chave', 'preservada');
    await db.put('members', 'a', { id: 'a' });
    await db.put('records', 'r', { id: 'r' });

    expect(await db.dump()).toEqual({ members: { a: { id: 'a' } }, records: { r: { id: 'r' } } });

    await db.clear();
    expect(await db.dump()).toEqual({});
    expect(await AsyncStorage.getItem('outra-chave')).toBe('preservada');
  });

  it('recupera-se de JSON corrompido tratando a coleção como vazia', async () => {
    await AsyncStorage.setItem('pf:db:members', '{quebrado');
    const db = createLocalDb();
    expect(await db.list('members')).toEqual([]);
    await db.put('members', 'a', { id: 'a' });
    expect(await db.list('members')).toEqual([{ id: 'a' }]);
  });
});
