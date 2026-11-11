import { DomainError, LOCAL_COLLECTIONS, newId, normalizeSearchText, removeLocalFiles, type LocalDb } from '@/shared/lib';
import type { Attachment, HealthRecord, HealthRecordRepository, RecordQuery } from '../domain/health-record';
import { filterByTypes, sortRecords } from '../domain/timeline';

function matchesText(record: HealthRecord, text: string): boolean {
  const haystack = normalizeSearchText([record.title, record.location, record.professional, record.notes].filter(Boolean).join(' '));
  return normalizeSearchText(text)
    .split(' ')
    .every((term) => haystack.includes(term));
}

export function createLocalHealthRecordRepository(db: LocalDb): HealthRecordRepository {
  const requireRecord = async (id: string): Promise<HealthRecord> => {
    const record = await db.get<HealthRecord>(LOCAL_COLLECTIONS.records, id);
    if (!record) throw new DomainError('record/not-found', 'Registro não encontrado.');
    return record;
  };

  return {
    async list(familyId, query: RecordQuery = {}) {
      let records = (await db.list<HealthRecord>(LOCAL_COLLECTIONS.records)).filter((r) => r.familyId === familyId);
      if (query.memberId) records = records.filter((r) => r.memberId === query.memberId);
      records = filterByTypes(records, query.types);
      const text = query.text?.trim();
      if (text) records = records.filter((r) => matchesText(r, text));
      return sortRecords(records);
    },

    getById: (id) => db.get<HealthRecord>(LOCAL_COLLECTIONS.records, id),

    async create(input) {
      const now = new Date().toISOString();
      const record: HealthRecord = { ...input, id: newId(), attachments: [], createdAt: now, updatedAt: now };
      await db.put(LOCAL_COLLECTIONS.records, record.id, record);
      return record;
    },

    async remove(id) {
      const record = await db.get<HealthRecord>(LOCAL_COLLECTIONS.records, id);
      if (!record) return;
      removeLocalFiles(record.attachments.map((a) => a.storagePath));
      await db.remove(LOCAL_COLLECTIONS.records, id);
    },

    async addAttachment(recordId, attachment) {
      const record = await requireRecord(recordId);
      const now = new Date().toISOString();
      const saved: Attachment = { ...attachment, recordId, createdAt: now };
      await db.put<HealthRecord>(LOCAL_COLLECTIONS.records, recordId, {
        ...record,
        attachments: [...record.attachments, saved],
        updatedAt: now,
      });
      return saved;
    },
  };
}
