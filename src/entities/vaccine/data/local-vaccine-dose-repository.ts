import { DomainError, LOCAL_COLLECTIONS, newId, type LocalDb } from '@/shared/lib';
import type { VaccineDoseRepository } from '../domain/ports';
import type { NewVaccineDose, VaccineDose, VaccineRuleDismissal } from '../domain/types';

/** Formas mínimas de pessoa e registro para conferir as chaves estrangeiras que o banco confere. */
interface MemberDoc {
  id: string;
  familyId: string;
}
interface RecordDoc {
  id: string;
  familyId: string;
  memberId: string;
}

const invalidReference = () => new DomainError('vaccine/invalid-reference', 'Pessoa ou documento não encontrado nesta família.');
const sameDose = (x: NewVaccineDose, y: NewVaccineDose) =>
  x.appliedOn !== null && // sem data não colide (null distinto, como no Postgres)
  x.memberId === y.memberId &&
  x.vaccineCode === y.vaccineCode &&
  x.doseKey === y.doseKey &&
  x.appliedOn === y.appliedOn;

/** Modo demo: emula as restrições de vaccine_doses e vaccine_rule_dismissals (dados-saude-backend.md §2 e §6.2). */
export function createLocalVaccineDoseRepository(db: LocalDb): VaccineDoseRepository {
  const doses = () => db.list<VaccineDose>(LOCAL_COLLECTIONS.vaccineDoses);
  const dismissals = () => db.list<VaccineRuleDismissal>(LOCAL_COLLECTIONS.vaccineRuleDismissals);

  async function requireMember(memberId: string, familyId: string) {
    const member = await db.get<MemberDoc>(LOCAL_COLLECTIONS.members, memberId);
    if (!member || member.familyId !== familyId) throw invalidReference();
  }

  async function check(dose: NewVaccineDose, others: NewVaccineDose[]) {
    await requireMember(dose.memberId, dose.familyId);
    if (dose.sourceRecordId) {
      const record = await db.get<RecordDoc>(LOCAL_COLLECTIONS.records, dose.sourceRecordId);
      if (!record || record.memberId !== dose.memberId || record.familyId !== dose.familyId) throw invalidReference();
    }
    if (dose.vaccineCode === 'other' && !dose.vaccineName?.trim()) {
      throw new DomainError('vaccine/invalid-dose', 'Confira os dados da dose.');
    }
    if (others.some((o) => sameDose(o, dose))) throw new DomainError('vaccine/duplicate-dose', 'Esta dose já está registrada.');
  }

  const sortDoses = (list: VaccineDose[]) =>
    list.sort(
      (x, y) => (y.appliedOn ?? '').localeCompare(x.appliedOn ?? '') || y.createdAt.localeCompare(x.createdAt),
    );

  return {
    listByMember: async (memberId) => sortDoses((await doses()).filter((d) => d.memberId === memberId)),
    listByFamily: async (familyId) => sortDoses((await doses()).filter((d) => d.familyId === familyId)),
    listBySourceRecord: async (recordId) => sortDoses((await doses()).filter((d) => d.sourceRecordId === recordId)),

    async createMany(items) {
      // Confere tudo antes de gravar: atômico como o insert único do Supabase.
      const existing = await doses();
      for (const [i, item] of items.entries()) await check(item, [...existing, ...items.slice(0, i)]);
      const now = new Date().toISOString();
      const created = items.map((item): VaccineDose => ({ ...item, id: newId(), createdAt: now, updatedAt: now }));
      for (const dose of created) await db.put(LOCAL_COLLECTIONS.vaccineDoses, dose.id, dose);
      return created;
    },

    async update(id, changes) {
      const current = await db.get<VaccineDose>(LOCAL_COLLECTIONS.vaccineDoses, id);
      if (!current) throw new DomainError('vaccine/not-found', 'Dose não encontrada.');
      const updated: VaccineDose = { ...current, ...changes, updatedAt: new Date().toISOString() };
      await check(updated, (await doses()).filter((d) => d.id !== id));
      await db.put(LOCAL_COLLECTIONS.vaccineDoses, id, updated);
      return updated;
    },

    remove: (id) => db.remove(LOCAL_COLLECTIONS.vaccineDoses, id),

    listDismissals: async (memberId) => (await dismissals()).filter((d) => d.memberId === memberId),
    listFamilyDismissals: async (familyId) => (await dismissals()).filter((d) => d.familyId === familyId),

    async dismiss(input) {
      await requireMember(input.memberId, input.familyId);
      if ((await dismissals()).some((d) => d.memberId === input.memberId && d.ruleId === input.ruleId)) {
        throw new DomainError('vaccine/duplicate-dismissal', 'Esta indicação já está em "Não se aplica".');
      }
      const dismissal: VaccineRuleDismissal = { ...input, id: newId(), createdAt: new Date().toISOString() };
      await db.put(LOCAL_COLLECTIONS.vaccineRuleDismissals, dismissal.id, dismissal);
      return dismissal;
    },

    undismiss: (id) => db.remove(LOCAL_COLLECTIONS.vaccineRuleDismissals, id),
  };
}
