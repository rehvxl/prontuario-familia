import { DomainError } from '../errors';
import { LOCAL_COLLECTIONS, type LocalDb } from './types';

/** Documento da sessão local: guarda só o id do usuário logado no modo demonstração. */
export interface LocalSessionDoc {
  userId: string;
}

export const LOCAL_SESSION_ID = 'current';

export async function getLocalUserId(db: LocalDb): Promise<string | null> {
  const doc = await db.get<LocalSessionDoc>(LOCAL_COLLECTIONS.session, LOCAL_SESSION_ID);
  return doc?.userId ?? null;
}

/** Id do usuário logado ou erro `auth/unauthenticated` (equivalente a uma chamada sem JWT no Supabase). */
export async function requireLocalUserId(db: LocalDb): Promise<string> {
  const id = await getLocalUserId(db);
  if (id === null) throw new DomainError('auth/unauthenticated', 'Você precisa entrar para continuar.');
  return id;
}
