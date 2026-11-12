import { DomainError, LOCAL_COLLECTIONS, isValidIsoDate, newId, type LocalDb } from '@/shared/lib';
import type { MeasurementRepository } from '../domain/ports';
import { compareByTakenOn } from '../domain/series';
import type { Measurement, MeasurementChanges, NewMeasurement } from '../domain/types';

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
const UPDATABLE: (keyof MeasurementChanges)[] = [
  'label', 'value', 'value2', 'unit', 'referenceLow', 'referenceHigh', 'referenceText', 'takenOn', 'takenAt', 'context', 'note',
];

const invalid = () => new DomainError('measurement/invalid', 'Não foi possível salvar a medição. Confira os dados.');
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1e9;
const isNumOrNull = (v: unknown) => v === null || isNum(v);
const maxLen = (v: string | null, max: number) => v === null || (typeof v === 'string' && v.length <= max);

/** Mesmas conferências (check) da tabela `measurements`, para o modo demo não aceitar o que o Supabase recusaria. */
function checkRow(m: NewMeasurement): void {
  const ok =
    (m.kind === 'lab' || m.kind === 'vital') &&
    /^[a-z0-9_]{1,40}$/.test(m.code) &&
    typeof m.label === 'string' && m.label.trim().length >= 1 && m.label.trim().length <= 120 &&
    isNum(m.value) &&
    isNumOrNull(m.value2) &&
    (m.code === 'bp') === (m.value2 !== null) &&
    maxLen(m.unit, 30) &&
    isNumOrNull(m.referenceLow) &&
    isNumOrNull(m.referenceHigh) &&
    (m.referenceLow === null || m.referenceHigh === null || m.referenceLow <= m.referenceHigh) &&
    maxLen(m.referenceText, 200) &&
    isValidIsoDate(m.takenOn) && m.takenOn >= '1900-01-01' &&
    (m.takenAt === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(m.takenAt)) &&
    (m.context === null || (['fasting', 'post_meal', 'other'].includes(m.context) && m.code === 'glucose_capillary')) &&
    maxLen(m.note, 140) &&
    (m.origin === 'ocr' || m.origin === 'manual') &&
    (m.kind === 'lab' || m.origin === 'manual');
  if (!ok) throw invalid();
}

export function createLocalMeasurementRepository(db: LocalDb): MeasurementRepository {
  const all = () => db.list<Measurement>(LOCAL_COLLECTIONS.measurements);
  const sorted = (items: Measurement[]) => items.sort(compareByTakenOn);

  /** FKs: pessoa da família e documento de origem da mesma pessoa e família. */
  const checkRefs = async (m: NewMeasurement) => {
    const member = await db.get<MemberDoc>(LOCAL_COLLECTIONS.members, m.memberId);
    if (!member || member.familyId !== m.familyId) throw invalid();
    if (m.sourceRecordId === null) return;
    const record = await db.get<RecordDoc>(LOCAL_COLLECTIONS.records, m.sourceRecordId);
    if (!record || record.memberId !== m.memberId || record.familyId !== m.familyId) throw invalid();
  };

  return {
    listByMember: async (memberId) => sorted((await all()).filter((m) => m.memberId === memberId)),
    listByFamily: async (familyId) => sorted((await all()).filter((m) => m.familyId === familyId)),
    listBySourceRecord: async (recordId) => sorted((await all()).filter((m) => m.sourceRecordId === recordId)),

    async createMany(items) {
      // Tudo ou nada, como o insert em lote do Supabase: confere todos antes de gravar o primeiro.
      const existing = await all();
      const taken = new Set(existing.filter((m) => m.sourceRecordId !== null && m.code !== 'other').map((m) => `${m.sourceRecordId}|${m.code}`));
      for (const item of items) {
        checkRow(item);
        await checkRefs(item);
        if (item.sourceRecordId === null || item.code === 'other') continue;
        // Um valor por analito do catálogo por documento (índice único measurements_source_code_idx).
        const key = `${item.sourceRecordId}|${item.code}`;
        if (taken.has(key)) throw new DomainError('measurement/duplicate', 'Este exame já foi salvo a partir deste documento.');
        taken.add(key);
      }
      const now = new Date().toISOString();
      const created = items.map((item): Measurement => ({ ...item, id: newId(), createdAt: now, updatedAt: now }));
      for (const m of created) await db.put(LOCAL_COLLECTIONS.measurements, m.id, m);
      return created;
    },

    async update(id, changes) {
      const current = await db.get<Measurement>(LOCAL_COLLECTIONS.measurements, id);
      if (!current) throw new DomainError('measurement/not-found', 'Medição não encontrada.');
      const patch: MeasurementChanges = {};
      for (const key of UPDATABLE) if (changes[key] !== undefined) Object.assign(patch, { [key]: changes[key] });
      const updated: Measurement = { ...current, ...patch, updatedAt: new Date().toISOString() };
      checkRow(updated);
      await db.put(LOCAL_COLLECTIONS.measurements, id, updated);
      return updated;
    },

    remove: (id) => db.remove(LOCAL_COLLECTIONS.measurements, id),
  };
}
