import { DomainError, LOCAL_COLLECTIONS, newId, type LocalDb } from '@/shared/lib';
import type { EmergencyCardRepository } from '../domain/ports';
import { emergencyCardFieldsSchema, emergencyCardSchema, type EmergencyCard } from '../domain/schema';

interface MemberDoc {
  id: string;
  familyId: string;
}

const invalid = () => new DomainError('emergency-card/invalid', 'Não foi possível salvar a ficha. Confira os dados.');

export function createLocalEmergencyCardRepository(db: LocalDb): EmergencyCardRepository {
  const all = () => db.list<EmergencyCard>(LOCAL_COLLECTIONS.emergencyCards);

  return {
    async getByMember(memberId) {
      return (await all()).find((card) => card.memberId === memberId) ?? null;
    },

    async upsert(memberId, familyId, draft) {
      const parsed = emergencyCardFieldsSchema.safeParse(draft);
      if (!parsed.success) throw invalid();
      const member = await db.get<MemberDoc>(LOCAL_COLLECTIONS.members, memberId);
      if (!member || member.familyId !== familyId) throw invalid();
      const current = (await all()).find((card) => card.memberId === memberId) ?? null;
      const now = new Date().toISOString();
      const next: EmergencyCard = emergencyCardSchema.parse({
        id: current?.id ?? newId(),
        familyId,
        memberId,
        ...parsed.data,
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
      });
      await db.put(LOCAL_COLLECTIONS.emergencyCards, next.id, next);
      return next;
    },

    async removeByMember(memberId) {
      const current = (await all()).find((card) => card.memberId === memberId);
      if (current) await db.remove(LOCAL_COLLECTIONS.emergencyCards, current.id);
    },
  };
}
