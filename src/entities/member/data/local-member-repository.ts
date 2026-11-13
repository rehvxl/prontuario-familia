import { DomainError, LOCAL_COLLECTIONS, newId, removeLocalFiles, type LocalDb } from '@/shared/lib';
import type { Member, MemberRepository } from '../domain/member';

/** Forma mínima do documento de registro (coleção `records`) necessária para a remoção em cascata. */
interface RecordDoc {
  id: string;
  memberId: string;
  attachments: { storagePath: string }[];
}

const HEALTH_COLLECTIONS = [
  LOCAL_COLLECTIONS.measurements,
  LOCAL_COLLECTIONS.vaccineDoses,
  LOCAL_COLLECTIONS.medications,
  LOCAL_COLLECTIONS.emergencyCards,
  LOCAL_COLLECTIONS.vaccineRuleDismissals,
];

export function createLocalMemberRepository(db: LocalDb): MemberRepository {
  const requireMember = async (id: string): Promise<Member> => {
    const member = await db.get<Member>(LOCAL_COLLECTIONS.members, id);
    if (!member) throw new DomainError('member/not-found', 'Pessoa não encontrada.');
    return member;
  };

  return {
    async listByFamily(familyId) {
      const all = await db.list<Member>(LOCAL_COLLECTIONS.members);
      return all.filter((m) => m.familyId === familyId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    getById: (id) => db.get<Member>(LOCAL_COLLECTIONS.members, id),

    async create(input) {
      const member: Member = { ...input, id: newId(), createdAt: new Date().toISOString() };
      await db.put(LOCAL_COLLECTIONS.members, member.id, member);
      return member;
    },

    async update(id, changes) {
      const updated: Member = { ...(await requireMember(id)), ...changes };
      await db.put(LOCAL_COLLECTIONS.members, id, updated);
      return updated;
    },

    async remove(id) {
      await requireMember(id);
      const records = (await db.list<RecordDoc>(LOCAL_COLLECTIONS.records)).filter((r) => r.memberId === id);
      removeLocalFiles(records.flatMap((r) => r.attachments.map((a) => a.storagePath)));
      for (const r of records) await db.remove(LOCAL_COLLECTIONS.records, r.id);
      // Imita o `on delete cascade` da FK (member_id, family_id) nas tabelas de saúde.
      for (const collection of HEALTH_COLLECTIONS) {
        const owned = (await db.list<{ id: string; memberId: string }>(collection)).filter((d) => d.memberId === id);
        for (const d of owned) await db.remove(collection, d.id);
      }
      await db.remove(LOCAL_COLLECTIONS.members, id);
    },
  };
}
