export type FamilyRole = 'owner' | 'editor';

export interface Family {
  id: string;
  name: string;
  createdAt: string; // ISO 8601
  myRole: FamilyRole;
}

export interface FamilyRepository {
  /** Família do usuário logado (MVP: 1 família por conta). */
  getMyFamily(): Promise<Family | null>;
  /** Cria a família e torna o usuário atual `owner`. */
  createFamily(name: string): Promise<Family>;
  rename(familyId: string, name: string): Promise<Family>;
}
