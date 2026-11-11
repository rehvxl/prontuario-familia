import type { Member, MemberChanges, NewMember, Relationship, Sex } from '../domain/member';

export interface MemberRow {
  id: string;
  family_id: string;
  full_name: string;
  birth_date: string | null;
  relationship: Relationship;
  sex: Sex;
  created_at: string;
}

export const MEMBER_COLUMNS = 'id,family_id,full_name,birth_date,relationship,sex,created_at';

export function mapMember(row: MemberRow): Member {
  return {
    id: row.id,
    familyId: row.family_id,
    fullName: row.full_name,
    birthDate: row.birth_date,
    relationship: row.relationship,
    sex: row.sex,
    createdAt: row.created_at,
  };
}

export function toMemberInsert(input: NewMember) {
  return {
    family_id: input.familyId,
    full_name: input.fullName.trim(),
    birth_date: input.birthDate,
    relationship: input.relationship,
    sex: input.sex,
  };
}

/** Só as chaves informadas (PATCH parcial); `birthDate: null` limpa a data. */
export function toMemberUpdate(changes: MemberChanges) {
  const patch: Record<string, unknown> = {};
  if (changes.fullName !== undefined) patch.full_name = changes.fullName.trim();
  if (changes.birthDate !== undefined) patch.birth_date = changes.birthDate;
  if (changes.relationship !== undefined) patch.relationship = changes.relationship;
  if (changes.sex !== undefined) patch.sex = changes.sex;
  return patch;
}
