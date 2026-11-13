import { DomainError } from '@/shared/lib';
import { emergencyCardFieldsSchema, type BloodType, type EmergencyCardDraft } from '@/entities/emergency-card';

export interface EmergencyCardFormValues {
  bloodType: BloodType;
  noKnownAllergies: boolean;
  allergies: { name: string; reaction: string }[];
  conditions: { name: string }[];
  contacts: { name: string; relation: string; phone: string }[];
  notes: string;
}

export const EMPTY_EMERGENCY_FORM: EmergencyCardFormValues = {
  bloodType: 'unknown',
  noKnownAllergies: false,
  allergies: [],
  conditions: [],
  contacts: [],
  notes: '',
};

export function contactError(contact: { name: string; relation: string; phone: string }): string | null {
  const started = contact.name.trim() || contact.relation.trim() || contact.phone.trim();
  if (!started) return null;
  if (!contact.name.trim() || !contact.phone.trim()) return 'Informe o nome e o telefone deste contato.';
  return null;
}

/** Linhas em branco saem. Contato começado precisa de nome e telefone. */
export function formToDraft(values: EmergencyCardFormValues): EmergencyCardDraft {
  const contacts = values.contacts.filter((contact) => contact.name.trim() || contact.relation.trim() || contact.phone.trim());
  const issue = contacts.map(contactError).find((error) => error);
  if (issue) throw new DomainError('emergency-card/invalid', issue);
  const parsed = emergencyCardFieldsSchema.safeParse({
    bloodType: values.bloodType,
    noKnownAllergies: values.noKnownAllergies,
    allergies: values.allergies.filter((item) => item.name.trim()).map((item) => ({ name: item.name, reaction: item.reaction.trim() ? item.reaction : null })),
    conditions: values.conditions.filter((item) => item.name.trim()),
    contacts: contacts.map((contact) => ({ name: contact.name, relation: contact.relation.trim() ? contact.relation : null, phone: contact.phone })),
    notes: values.notes,
  });
  if (!parsed.success) throw new DomainError('emergency-card/invalid', 'Não foi possível salvar a ficha. Confira os dados.');
  return parsed.data;
}

export function formFromCard(card: EmergencyCardDraft | null): EmergencyCardFormValues {
  if (!card) return EMPTY_EMERGENCY_FORM;
  return {
    bloodType: card.bloodType,
    noKnownAllergies: card.noKnownAllergies,
    allergies: card.allergies.map((item) => ({ name: item.name, reaction: item.reaction ?? '' })),
    conditions: card.conditions.map((item) => ({ name: item.name })),
    contacts: card.contacts.map((item) => ({ name: item.name, relation: item.relation ?? '', phone: item.phone })),
    notes: card.notes ?? '',
  };
}
