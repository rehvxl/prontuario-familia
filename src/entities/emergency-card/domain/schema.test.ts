import { BLOOD_TYPE_LABELS, allergySchema, conditionSchema, contactSchema, emergencyCardFieldsSchema, filledFieldCount, hasDeclaredContent } from './schema';

const allergy = { name: 'Dipirona', reaction: 'urticária' };
const contact = { name: 'Marina', relation: 'irmã', phone: '11999990000' };

describe('ficha de emergência (domínio)', () => {
  it('aceita a ficha vazia e aplica os padrões', () => {
    const card = emergencyCardFieldsSchema.parse({});
    expect(card).toEqual({
      bloodType: 'unknown',
      noKnownAllergies: false,
      allergies: [],
      conditions: [],
      contacts: [],
      notes: null,
    });
    expect(hasDeclaredContent(card)).toBe(false);
    expect(hasDeclaredContent(null)).toBe(false);
    expect(filledFieldCount(card)).toBe(0);
  });

  it('rejeita mutex, contato sem telefone, nota longa e o quarto contato', () => {
    expect(() => emergencyCardFieldsSchema.parse({ noKnownAllergies: true, allergies: [allergy] })).toThrow(/não combina/);
    expect(() => emergencyCardFieldsSchema.parse({ contacts: [{ name: 'Marina', phone: '' }] })).toThrow();
    expect(() => emergencyCardFieldsSchema.parse({ notes: 'a'.repeat(281) })).toThrow();
    expect(() =>
      emergencyCardFieldsSchema.parse({
        contacts: [contact, contact, contact, contact],
      }),
    ).toThrow();
  });

  it('bate com emergency_card_lists_valid: tamanhos, chaves e telefone sem máscara', () => {
    const name = 'a'.repeat(120);
    const parsed = emergencyCardFieldsSchema.parse({
      allergies: [{ name: `  ${name}  `, reaction: 'b'.repeat(120) }, { name: 'Pólen', reaction: '   ' }],
      conditions: [{ name: ' Asma ' }],
      contacts: [{ name: 'Marina', relation: ' irmã ', phone: '+55 (11) 99999-0000' }],
      notes: ` ${'c'.repeat(280)} `,
    });
    expect(parsed.allergies[0]).toEqual({ name, reaction: 'b'.repeat(120) });
    expect(parsed.allergies[1]?.reaction).toBeNull();
    expect(parsed.conditions).toEqual([{ name: 'Asma' }]);
    expect(parsed.contacts[0]?.phone).toBe('+5511999990000');
    expect(parsed.contacts[0]?.phone).not.toMatch(/[\s().-]/);
    expect(parsed.notes).toHaveLength(280);

    expect(emergencyCardFieldsSchema.parse({ allergies: Array.from({ length: 50 }, () => ({ name: 'A' })) }).allergies).toHaveLength(50);
    expect(emergencyCardFieldsSchema.parse({ conditions: Array.from({ length: 50 }, () => ({ name: 'A' })) }).conditions).toHaveLength(50);
    expect(emergencyCardFieldsSchema.parse({ contacts: [1, 2, 3].map((n) => ({ name: `P${n}`, phone: '11999990000' })) }).contacts).toHaveLength(3);

    expect(() => allergySchema.parse({ name: 'a'.repeat(121) })).toThrow();
    expect(() => allergySchema.parse({ name: 'A', reaction: 'b'.repeat(121) })).toThrow();
    expect(() => allergySchema.parse({ name: 'A', extra: true })).toThrow();
    expect(() => conditionSchema.parse({ name: 'A', note: 'x' })).toThrow();
    expect(() => contactSchema.parse({ name: 'A', phone: '11999990000', email: 'a@b.c' })).toThrow();
    expect(() => contactSchema.parse({ name: 'A', phone: '1'.repeat(31) })).toThrow();
    expect(() => contactSchema.parse({ name: 'A', phone: ' ( ) - . ' })).toThrow();
    expect(() => emergencyCardFieldsSchema.parse({ notes: 'c'.repeat(281) })).toThrow();
    expect(() => emergencyCardFieldsSchema.parse({ allergies: Array.from({ length: 51 }, () => ({ name: 'A' })) })).toThrow();
    expect(() => emergencyCardFieldsSchema.parse({ conditions: Array.from({ length: 51 }, () => ({ name: 'A' })) })).toThrow();
  });

  it('conta conteúdo declarado sem tratar “Não sei” como preenchido', () => {
    const card = emergencyCardFieldsSchema.parse({
      bloodType: 'A-',
      noKnownAllergies: true,
      conditions: [{ name: 'Asma' }],
      contacts: [contact],
      notes: 'Usa marca-passo',
    });
    expect(hasDeclaredContent(card)).toBe(true);
    expect(filledFieldCount(card)).toBe(5);
    expect(BLOOD_TYPE_LABELS['A-']).toBe('A−');
    expect(BLOOD_TYPE_LABELS.unknown).toBe('Não sei');
  });
});
