/** Nomes das coleções do banco local (modo demonstração). Compartilhado pelos adaptadores `local-*` das entities. */
export const LOCAL_COLLECTIONS = {
  session: 'session',
  users: 'users',
  families: 'families',
  members: 'members',
  records: 'records',
  consents: 'consents',
} as const;

export type Dump = Record<string, Record<string, unknown>>;

/** Store de documentos JSON em coleções nomeadas. Implementação de produção: AsyncStorage. */
export interface LocalDb {
  get<T>(collection: string, id: string): Promise<T | null>;
  put<T>(collection: string, id: string, value: T): Promise<void>;
  remove(collection: string, id: string): Promise<void>;
  list<T>(collection: string): Promise<T[]>;
  /** Todas as coleções e documentos (exportação e depuração). */
  dump(): Promise<Dump>;
  /** Apaga tudo (exclusão de conta). */
  clear(): Promise<void>;
}
