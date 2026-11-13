import type { EmergencyCard, EmergencyCardDraft } from '../domain/schema';

/** Linha de `emergency_cards`. O app não atualiza family_id nem member_id. */
export interface EmergencyCardRow {
  id: string;
  family_id: string;
  member_id: string;
  blood_type: EmergencyCard['bloodType'];
  no_known_allergies: boolean;
  allergies: EmergencyCard['allergies'];
  conditions: EmergencyCard['conditions'];
  contacts: EmergencyCard['contacts'];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const EMERGENCY_CARD_COLUMNS =
  'id,family_id,member_id,blood_type,no_known_allergies,allergies,conditions,contacts,notes,created_at,updated_at';

export function mapEmergencyCard(row: EmergencyCardRow): EmergencyCard {
  return {
    id: row.id,
    familyId: row.family_id,
    memberId: row.member_id,
    bloodType: row.blood_type,
    noKnownAllergies: row.no_known_allergies,
    allergies: row.allergies ?? [],
    conditions: row.conditions ?? [],
    contacts: row.contacts ?? [],
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Colunas com grant de insert. `id` e `created_by` ficam com o padrão do banco. */
export function toEmergencyCardInsert(memberId: string, familyId: string, draft: EmergencyCardDraft) {
  return {
    family_id: familyId,
    member_id: memberId,
    blood_type: draft.bloodType,
    no_known_allergies: draft.noKnownAllergies,
    allergies: draft.allergies,
    conditions: draft.conditions,
    contacts: draft.contacts,
    notes: draft.notes,
  };
}

/** Colunas com grant de update. Sem family_id, member_id, id nem datas. */
export function toEmergencyCardUpdate(draft: EmergencyCardDraft) {
  return {
    blood_type: draft.bloodType,
    no_known_allergies: draft.noKnownAllergies,
    allergies: draft.allergies,
    conditions: draft.conditions,
    contacts: draft.contacts,
    notes: draft.notes,
  };
}
