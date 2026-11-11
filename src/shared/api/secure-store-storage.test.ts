import { createChunkedStorage, type SecureStoreLike } from './secure-store-storage';

function memoryStore(): SecureStoreLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItemAsync: async (k) => data.get(k) ?? null,
    setItemAsync: async (k, v) => {
      data.set(k, v);
    },
    deleteItemAsync: async (k) => {
      data.delete(k);
    },
  };
}

describe('createChunkedStorage', () => {
  it('guarda e lê valores maiores que o limite do SecureStore', async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store, 10);
    const value = JSON.stringify({ access_token: 'a'.repeat(95), user: { id: 'x' } });

    await storage.setItem('prontuario-auth', value);

    expect(store.data.size).toBeGreaterThan(2);
    expect([...store.data.values()].every((v) => v.length <= 10)).toBe(true);
    expect(await storage.getItem('prontuario-auth')).toBe(value);
  });

  it('devolve null quando não há nada salvo', async () => {
    expect(await createChunkedStorage(memoryStore()).getItem('x')).toBeNull();
  });

  it('ao regravar com valor menor, não sobram pedaços antigos', async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store, 5);
    await storage.setItem('k', 'x'.repeat(23));
    await storage.setItem('k', 'abc');

    expect(await storage.getItem('k')).toBe('abc');
    expect([...store.data.keys()].sort()).toEqual(['k.0', 'k.n']);
  });

  it('removeItem apaga todos os pedaços e o contador', async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store, 4);
    await storage.setItem('k', 'abcdefghijkl');
    await storage.removeItem('k');

    expect(store.data.size).toBe(0);
    expect(await storage.getItem('k')).toBeNull();
  });

  it('trata pedaço faltando como sessão ausente (não devolve JSON quebrado)', async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store, 4);
    await storage.setItem('k', 'abcdefghijkl');
    store.data.delete('k.1');

    expect(await storage.getItem('k')).toBeNull();
  });

  it('mantém valores com caracteres acentuados', async () => {
    const storage = createChunkedStorage(memoryStore(), 3);
    expect(await (async () => { await storage.setItem('k', 'ação é São Paulo'); return storage.getItem('k'); })()).toBe('ação é São Paulo');
  });
});
