import { z } from 'zod';

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

/** Rótulos de tela: hífen tipográfico. No banco e no código permanece 'A-'. */
export const BLOOD_TYPE_LABELS: Record<BloodType, string> = {
  'A+': 'A+',
  'A-': 'A−',
  'B+': 'B+',
  'B-': 'B−',
  'AB+': 'AB+',
  'AB-': 'AB−',
  'O+': 'O+',
  'O-': 'O−',
  unknown: 'Não sei',
};

/**
 * Limites iguais ao CHECK `private.emergency_card_lists_valid` (PR #13):
 * nome 1–120 após trim, reação/relação até 120 ou nulo, telefone 1–30, só as chaves do contrato.
 * A máscara de digitação não é gravada: o tamanho vale para o telefone já sem máscara, que é o texto que o CHECK mede.
 */
const optionalText = z
  .string()
  .trim()
  .max(120)
  .nullish()
  .transform((value) => (value && value.length > 0 ? value : null));

const requiredName = z.string().trim().min(1).max(120);

/** Parênteses, hífen, ponto e espaços são máscara. O `+` e os dígitos ficam. */
export function unmaskPhone(value: string): string {
  return value.replace(/[\s().-]/g, '');
}

export const allergySchema = z
  .object({
    name: requiredName,
    reaction: optionalText,
  })
  .strict();

export const conditionSchema = z
  .object({
    name: requiredName,
  })
  .strict();

export const contactSchema = z
  .object({
    name: requiredName,
    relation: optionalText,
    phone: z.string().transform(unmaskPhone).pipe(z.string().min(1).max(30)),
  })
  .strict();

export const emergencyCardFieldsSchema = z
  .object({
    bloodType: z.enum(BLOOD_TYPES).default('unknown'),
    noKnownAllergies: z.boolean().default(false),
    allergies: z.array(allergySchema).max(50).default([]),
    conditions: z.array(conditionSchema).max(50).default([]),
    contacts: z.array(contactSchema).max(3).default([]),
    notes: z
      .string()
      .trim()
      .max(280)
      .nullish()
      .transform((value) => (value && value.length > 0 ? value : null)),
    // O CHECK do banco mede `char_length(notes) <= 280` no texto gravado. O app corta o espaço das pontas antes.
  })
  .superRefine((value, ctx) => {
    if (value.noKnownAllergies && value.allergies.length > 0) {
      ctx.addIssue({ code: 'custom', message: 'Sem alergias conhecidas não combina com a lista.' });
    }
  });

export const emergencyCardSchema = emergencyCardFieldsSchema.and(
  z.object({
    id: z.uuid(),
    familyId: z.uuid(),
    memberId: z.uuid(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
);

export type EmergencyAllergy = z.infer<typeof allergySchema>;
export type EmergencyCondition = z.infer<typeof conditionSchema>;
export type EmergencyContact = z.infer<typeof contactSchema>;
export type EmergencyCard = z.infer<typeof emergencyCardSchema>;
export type EmergencyCardDraft = z.infer<typeof emergencyCardFieldsSchema>;

/** Estado vazio da UI: sem linha, ou só “Não sei” e o resto em branco. */
export function hasDeclaredContent(card: EmergencyCardDraft | null): boolean {
  if (!card) return false;
  return (
    card.bloodType !== 'unknown' ||
    card.noKnownAllergies ||
    card.allergies.length > 0 ||
    card.conditions.length > 0 ||
    card.contacts.length > 0 ||
    Boolean(card.notes && card.notes.length > 0)
  );
}

/** Contagem para analytics. Nunca inclui o valor clínico, só quantos grupos foram preenchidos. */
export function filledFieldCount(card: EmergencyCardDraft): number {
  return (
    (card.bloodType !== 'unknown' ? 1 : 0) +
    (card.noKnownAllergies || card.allergies.length > 0 ? 1 : 0) +
    (card.conditions.length > 0 ? 1 : 0) +
    (card.contacts.length > 0 ? 1 : 0) +
    (card.notes ? 1 : 0)
  );
}
