import * as SecureStore from 'expo-secure-store';
import { createChunkedStorage, type SecureStoreLike } from '@/shared/api';
import type { EmergencyReadSnapshot } from '../domain/snapshot';

const PREFIX = 'pf.emergency';

function safe(id: string): string {
  return id.replace(/[^A-Za-z0-9._-]/g, '_');
}

function indexKey(userId: string): string {
  return `${PREFIX}.${safe(userId)}.index`;
}

function itemKey(userId: string, memberId: string): string {
  return `${PREFIX}.${safe(userId)}.${safe(memberId)}`;
}

function isSnapshot(value: unknown): value is EmergencyReadSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snap = value as Partial<EmergencyReadSnapshot>;
  return typeof snap.identity?.fullName === 'string' && Array.isArray(snap.medications) && (snap.card === null || typeof snap.card === 'object');
}

/** Cache de leitura da ficha, fatiado no SecureStore. Sem lista de chaves: um índice por usuário. */
export function createEmergencyReadCache(store: SecureStoreLike) {
  const storage = createChunkedStorage(store);

  async function membersOf(userId: string): Promise<string[]> {
    const raw = await storage.getItem(indexKey(userId));
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  }

  return {
    async read(userId: string, memberId: string): Promise<EmergencyReadSnapshot | null> {
      const raw = await storage.getItem(itemKey(userId, memberId));
      if (!raw) return null;
      try {
        const parsed: unknown = JSON.parse(raw);
        return isSnapshot(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },

    async write(userId: string, memberId: string, snapshot: EmergencyReadSnapshot): Promise<void> {
      await storage.setItem(itemKey(userId, memberId), JSON.stringify(snapshot));
      const members = await membersOf(userId);
      if (!members.includes(memberId)) await storage.setItem(indexKey(userId), JSON.stringify([...members, memberId]));
    },

    async clearUser(userId: string): Promise<void> {
      const members = await membersOf(userId);
      await Promise.all(members.map((memberId) => storage.removeItem(itemKey(userId, memberId))));
      await storage.removeItem(indexKey(userId));
    },
  };
}

function defaultCache() {
  return createEmergencyReadCache(SecureStore);
}

export async function readEmergencyReadCache(userId: string, memberId: string): Promise<EmergencyReadSnapshot | null> {
  try {
    return await defaultCache().read(userId, memberId);
  } catch {
    return null;
  }
}

export async function writeEmergencyReadCache(userId: string, memberId: string, snapshot: EmergencyReadSnapshot): Promise<void> {
  try {
    await defaultCache().write(userId, memberId, snapshot);
  } catch {
    // A leitura em tela continua; a próxima abertura com rede grava de novo.
  }
}

/** Sai da conta ou exclui a conta: o cache desta pessoa some. Falha aqui não bloqueia o logout. */
export async function clearEmergencyReadCache(userId: string): Promise<void> {
  try {
    await defaultCache().clearUser(userId);
  } catch {
    // Sair da conta não pode falhar por causa do cache.
  }
}
