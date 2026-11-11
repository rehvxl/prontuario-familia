import { DomainError, LOCAL_COLLECTIONS, newId, removeLocalFiles, type LocalDb } from '@/shared/lib';
import type { Member, MemberRepository } from '../domain/member';

/** Forma mínima do documento de registro (coleção `records`) necessária para a remoção em cascata. */
interface RecordDoc {
  id: string;
  memberId: string;
  attachments: { storagePath: string }[];
}

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
      await db.remove(LOCAL_COLLECTIONS.members, id);
    },
  };
}
