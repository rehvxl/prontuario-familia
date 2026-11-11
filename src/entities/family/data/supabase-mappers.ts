import type { Family, FamilyRole } from '../domain/family';

export interface FamilyRow {
  id: string;
  name: string;
  created_at: string;
}

export const FAMILY_COLUMNS = 'id,name,created_at';

export function mapFamily(row: FamilyRow, myRole: FamilyRole): Family {
  return { id: row.id, name: row.name, createdAt: row.created_at, myRole };
}

export const isFamilyRole = (v: unknown): v is FamilyRole => v === 'owner' || v === 'editor';
