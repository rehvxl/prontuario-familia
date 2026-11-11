import { DomainError, LOCAL_COLLECTIONS, newId, requireLocalUserId, type LocalDb } from '@/shared/lib';
import type { Family, FamilyRepository } from '../domain/family';

type FamilyDoc = Omit<Family, 'myRole'> & { ownerId: string };

const toFamily = (doc: FamilyDoc): Family => ({ id: doc.id, name: doc.name, createdAt: doc.createdAt, myRole: 'owner' });

/** Família no modo demonstração: 1 por conta; o usuário logado é sempre `owner`. */
export function createLocalFamilyRepository(db: LocalDb): FamilyRepository {
  const findMine = async (userId: string) =>
    (await db.list<FamilyDoc>(LOCAL_COLLECTIONS.families)).find((f) => f.ownerId === userId) ?? null;

  return {
    async getMyFamily() {
      const doc = await findMine(await requireLocalUserId(db));
      return doc ? toFamily(doc) : null;
    },

    async createFamily(name) {
      const userId = await requireLocalUserId(db);
      if (await findMine(userId)) throw new DomainError('family/already-exists', 'Você já tem uma família criada.');
      const doc: FamilyDoc = { id: newId(), name, createdAt: new Date().toISOString(), ownerId: userId };
      await db.put(LOCAL_COLLECTIONS.families, doc.id, doc);
      return toFamily(doc);
    },

    async rename(familyId, name) {
      const userId = await requireLocalUserId(db);
      const doc = await db.get<FamilyDoc>(LOCAL_COLLECTIONS.families, familyId);
      if (!doc || doc.ownerId !== userId) throw new DomainError('family/not-found', 'Família não encontrada.');
      const updated = { ...doc, name };
      await db.put(LOCAL_COLLECTIONS.families, familyId, updated);
      return toFamily(updated);
    },
  };
}
