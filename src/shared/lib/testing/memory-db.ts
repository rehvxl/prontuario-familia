import type { Dump, LocalDb } from '../local-db/types';

/** `LocalDb` em memória para testes (mesma semântica do AsyncStorage, sem E/S). */
export function createMemoryDb(): LocalDb {
  let data: Dump = {};
  const col = (name: string) => (data[name] ??= {});
  return {
    get: async <T,>(c: string, id: string) => (id in col(c) ? (col(c)[id] as T) : null),
    put: async <T,>(c: string, id: string, value: T) => {
      col(c)[id] = JSON.parse(JSON.stringify(value));
    },
    remove: async (c, id) => {
      delete col(c)[id];
    },
    list: async <T,>(c: string) => Object.values(col(c)) as T[],
    dump: async () => structuredClone(data),
    clear: async () => {
      data = {};
    },
  };
}
