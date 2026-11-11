import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Interface de armazenamento que o supabase-js espera (auth.storage). */
export interface AsyncKeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** Subconjunto do expo-secure-store usado aqui (facilita testar com um mock). */
export interface SecureStoreLike {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

/**
 * O SecureStore tem limite por item (~2 KB no iOS) e a sessão do Supabase (JWT + refresh token + user) passa disso.
 * Solução: o valor é fatiado em pedaços `${key}.0`, `${key}.1`... e `${key}.n` guarda a quantidade.
 * As chaves só podem ter [A-Za-z0-9._-], por isso o `storageKey` do cliente é fixo e simples.
 */
export const SECURE_STORE_CHUNK_SIZE = 1800;

export function createChunkedStorage(store: SecureStoreLike, chunkSize = SECURE_STORE_CHUNK_SIZE): AsyncKeyValueStorage {
  const countKey = (key: string) => `${key}.n`;
  const chunkKey = (key: string, i: number) => `${key}.${i}`;

  async function readCount(key: string): Promise<number> {
    const raw = await store.getItemAsync(countKey(key));
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  async function removeItem(key: string): Promise<void> {
    const n = await readCount(key);
    await Promise.all(Array.from({ length: n }, (_, i) => store.deleteItemAsync(chunkKey(key, i))));
    await store.deleteItemAsync(countKey(key));
  }

  return {
    async getItem(key) {
      const n = await readCount(key);
      if (n === 0) return null;
      const parts = await Promise.all(Array.from({ length: n }, (_, i) => store.getItemAsync(chunkKey(key, i))));
      // Sessão corrompida/incompleta: melhor deslogar do que quebrar o parse do JSON.
      if (parts.some((p) => p === null)) return null;
      return parts.join('');
    },
    async setItem(key, value) {
      await removeItem(key);
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += chunkSize) chunks.push(value.slice(i, i + chunkSize));
      await Promise.all(chunks.map((c, i) => store.setItemAsync(chunkKey(key, i), c)));
      await store.setItemAsync(countKey(key), String(chunks.length));
    },
    removeItem,
  };
}

/** Armazenamento de sessão do app: SecureStore no iOS/Android; localStorage só na web (dev). */
export function createSessionStorage(): AsyncKeyValueStorage {
  if (Platform.OS === 'web') {
    const ls = typeof localStorage === 'undefined' ? null : localStorage;
    return {
      getItem: async (k) => ls?.getItem(k) ?? null,
      setItem: async (k, v) => ls?.setItem(k, v),
      removeItem: async (k) => ls?.removeItem(k),
    };
  }
  return createChunkedStorage(SecureStore);
}
