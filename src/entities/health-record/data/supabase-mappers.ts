import type { Attachment, HealthRecord, NewHealthRecord, RecordType } from '../domain/health-record';

export interface AttachmentRow {
  id: string;
  record_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number | string; // bigint pode chegar como string
  created_at: string;
}

export interface HealthRecordRow {
  id: string;
  family_id: string;
  member_id: string;
  type: RecordType;
  title: string;
  record_date: string;
  location: string | null;
  professional: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  attachments?: AttachmentRow[] | null;
}

const ATTACHMENT_COLUMNS = 'id,record_id,storage_path,file_name,mime_type,size_bytes,created_at';

/** Colunas explícitas (evita trazer o tsvector `search`) + anexos embutidos num único round-trip. */
export const RECORD_SELECT = `id,family_id,member_id,type,title,record_date,location,professional,notes,created_at,updated_at,attachments(${ATTACHMENT_COLUMNS})`;
export const ATTACHMENT_SELECT = ATTACHMENT_COLUMNS;

export function mapAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    recordId: row.record_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    createdAt: row.created_at,
  };
}

export function mapHealthRecord(row: HealthRecordRow): HealthRecord {
  return {
    id: row.id,
    familyId: row.family_id,
    memberId: row.member_id,
    type: row.type,
    title: row.title,
    date: row.record_date,
    location: row.location,
    professional: row.professional,
    notes: row.notes,
    attachments: (row.attachments ?? []).map(mapAttachment).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const blankToNull = (v: string | null): string | null => (v && v.trim().length > 0 ? v.trim() : null);

export function toRecordInsert(input: NewHealthRecord) {
  return {
    family_id: input.familyId,
    member_id: input.memberId,
    type: input.type,
    title: input.title.trim(),
    record_date: input.date,
    location: blankToNull(input.location),
    professional: blankToNull(input.professional),
    notes: blankToNull(input.notes),
  };
}
