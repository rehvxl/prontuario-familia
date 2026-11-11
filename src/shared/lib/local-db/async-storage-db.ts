import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Dump, LocalDb } from './types';

const PREFIX = 'pf:db:';
type Collection = Record<string, unknown>;

/**
 * Banco local sobre AsyncStorage: uma chave por coleção (`pf:db:<coleção>`) com um mapa id → documento.
 * Escritas são serializadas numa fila para que read-modify-write concorrentes não percam dados.
 * Pensado para o modo demonstração (volume pequeno); não usar para produção.
 */
export function createLocalDb(storage: Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem' | 'getAllKeys' | 'multiGet' | 'multiRemove'> = AsyncStorage): LocalDb {
  let queue: Promise<unknown> = Promise.resolve();
  const serialize = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  };

  const readCollection = async (name: string): Promise<Collection> => {
    const raw = await storage.getItem(PREFIX + name);
    if (!raw) return {};
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as Collection) : {};
    } catch {
      return {};
    }
  };

  const writeCollection = async (name: string, data: Collection): Promise<void> => {
    if (Object.keys(data).length === 0) await storage.removeItem(PREFIX + name);
    else await storage.setItem(PREFIX + name, JSON.stringify(data));
  };

  return {
    async get<T>(collection: string, id: string) {
      await queue;
      const data = await readCollection(collection);
      return id in data ? (data[id] as T) : null;
    },
    put<T>(collection: string, id: string, value: T) {
      return serialize(async () => {
        const data = await readCollection(collection);
        data[id] = value;
        await writeCollection(collection, data);
      });
    },
    remove(collection, id) {
      return serialize(async () => {
        const data = await readCollection(collection);
        if (!(id in data)) return;
        delete data[id];
        await writeCollection(collection, data);
      });
    },
    async list<T>(collection: string) {
      await queue;
      return Object.values(await readCollection(collection)) as T[];
    },
    async dump() {
      await queue;
      const keys = (await storage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
      const pairs = await storage.multiGet(keys);
      const out: Dump = {};
      for (const [key, raw] of pairs) {
        if (raw) out[key.slice(PREFIX.length)] = JSON.parse(raw) as Collection;
      }
      return out;
    },
    clear() {
      return serialize(async () => {
        const keys = (await storage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
        if (keys.length > 0) await storage.multiRemove(keys);
      });
    },
  };
}
