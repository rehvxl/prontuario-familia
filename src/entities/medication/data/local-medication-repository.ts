import { DomainError, LOCAL_COLLECTIONS, isValidIsoDate, newId, type LocalDb } from '@/shared/lib';
import type { MedicationRepository } from '../domain/ports';
import type { Medication, MedicationChanges, NewMedication } from '../domain/types';

/** Campos mínimos dos documentos de outras coleções usados nas conferências de integridade. */
interface MemberDoc {
  id: string;
  familyId: string;
}
interface RecordDoc {
  id: string;
  familyId: string;
  memberId: string;
}

/** Colunas com grant de update no Supabase (dados-saude-backend.md §2). */
const UPDATABLE: (keyof MedicationChanges)[] = ['name', 'dosage', 'instructions', 'startOn', 'endOn'];

const invalid = () => new DomainError('medication/invalid', 'Não foi possível salvar o medicamento. Confira os dados.');
const maxLen = (v: string | null, max: number) => v === null || (typeof v === 'string' && v.length <= max);
const validDate = (v: string) => isValidIsoDate(v) && v >= '1900-01-01';

/** Mesmas conferências (check) da tabela `medications`. */
function checkRow(m: NewMedication): void {
  const ok =
    typeof m.name === 'string' && m.name.trim().length >= 1 && m.name.trim().length <= 120 &&
    maxLen(m.dosage, 60) &&
    maxLen(m.instructions, 500) &&
    validDate(m.startOn) &&
    (m.endOn === null || (isValidIsoDate(m.endOn) && m.endOn >= m.startOn)) &&
    (m.origin === 'ocr' || m.origin === 'manual');
  if (!ok) throw invalid();
}

/** Ordem da lista: início mais recente primeiro (índice medications_member_idx). */
const byStartDesc = (a: Medication, b: Medication) => b.startOn.localeCompare(a.startOn) || b.createdAt.localeCompare(a.createdAt);

export function createLocalMedicationRepository(db: LocalDb): MedicationRepository {
  const all = () => db.list<Medication>(LOCAL_COLLECTIONS.medications);

  const checkRefs = async (m: NewMedication) => {
    const member = await db.get<MemberDoc>(LOCAL_COLLECTIONS.members, m.memberId);
    if (!member || member.familyId !== m.familyId) throw invalid();
    if (m.sourceRecordId === null) return;
    const record = await db.get<RecordDoc>(LOCAL_COLLECTIONS.records, m.sourceRecordId);
    if (!record || record.memberId !== m.memberId || record.familyId !== m.familyId) throw invalid();
  };

  return {
    listByMember: async (memberId) => (await all()).filter((m) => m.memberId === memberId).sort(byStartDesc),
    listByFamily: async (familyId) => (await all()).filter((m) => m.familyId === familyId).sort(byStartDesc),
    listBySourceRecord: async (recordId) => (await all()).filter((m) => m.sourceRecordId === recordId).sort(byStartDesc),

    async createMany(items) {
      // Tudo ou nada: confere todos antes de gravar o primeiro.
      for (const item of items) {
        checkRow(item);
        await checkRefs(item);
      }
      const now = new Date().toISOString();
      const created = items.map((item): Medication => ({ ...item, id: newId(), createdAt: now, updatedAt: now }));
      for (const m of created) await db.put(LOCAL_COLLECTIONS.medications, m.id, m);
      return created;
    },

    async update(id, changes) {
      const current = await db.get<Medication>(LOCAL_COLLECTIONS.medications, id);
      if (!current) throw new DomainError('medication/not-found', 'Medicamento não encontrado.');
      const patch: MedicationChanges = {};
      for (const key of UPDATABLE) if (changes[key] !== undefined) Object.assign(patch, { [key]: changes[key] });
      const updated: Medication = { ...current, ...patch, updatedAt: new Date().toISOString() };
      checkRow(updated);
      await db.put(LOCAL_COLLECTIONS.medications, id, updated);
      return updated;
    },

    remove: (id) => db.remove(LOCAL_COLLECTIONS.medications, id),
  };
}
