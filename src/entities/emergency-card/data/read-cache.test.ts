import type { SecureStoreLike } from '@/shared/api';
import type { EmergencyReadSnapshot } from '../domain/snapshot';
import { createEmergencyReadCache } from './read-cache';

function memoryStore(): SecureStoreLike {
  const data = new Map<string, string>();
  return {
    getItemAsync: async (key) => data.get(key) ?? null,
    setItemAsync: async (key, value) => {
      data.set(key, value);
    },
    deleteItemAsync: async (key) => {
      data.delete(key);
    },
  };
}

const snapshot = (name: string): EmergencyReadSnapshot => ({
  card: null,
  identity: { fullName: name, birthDate: '1959-03-01', relationship: 'spouse', sex: 'male' },
  medications: [],
  cachedAt: '2026-11-12T12:00:00.000Z',
});

describe('cache de leitura da ficha', () => {
  it('grava depois de ler e relê com a consulta ausente', async () => {
    const cache = createEmergencyReadCache(memoryStore());
    expect(await cache.read('user-1', 'member-1')).toBeNull();
    await cache.write('user-1', 'member-1', snapshot('Carlos Souza'));
    expect((await cache.read('user-1', 'member-1'))?.identity.fullName).toBe('Carlos Souza');
    expect(await cache.read('user-1', 'member-2')).toBeNull();
  });

  it('não mistura contas e some no logout', async () => {
    const cache = createEmergencyReadCache(memoryStore());
    await cache.write('user-1', 'member-1', snapshot('Carlos'));
    await cache.write('user-2', 'member-1', snapshot('Outra conta'));
    await cache.clearUser('user-1');
    expect(await cache.read('user-1', 'member-1')).toBeNull();
    expect((await cache.read('user-2', 'member-1'))?.identity.fullName).toBe('Outra conta');
  });

  it('json inválido não vira dado inventado', async () => {
    const store = memoryStore();
    const cache = createEmergencyReadCache(store);
    await store.setItemAsync('pf.emergency.user-1.member-1.n', '1');
    await store.setItemAsync('pf.emergency.user-1.member-1.0', '{"card":1}');
    expect(await cache.read('user-1', 'member-1')).toBeNull();
  });
});
