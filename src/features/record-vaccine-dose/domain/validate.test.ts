import { validateDismissalInput, validateDoseInput } from './validate';

const TODAY = '2026-11-11';
const base = { familyId: 'f1', memberId: 'm1', vaccineCode: 'penta', doseKey: 'D1', appliedOn: '2026-03-10' };

describe('validateDoseInput (F3.5)', () => {
  it('normaliza a dose do catálogo: rótulo pela chave, textos vazios viram null, origem manual por padrão', () => {
    expect(validateDoseInput({ ...base, vaccineName: 'ignorado', lot: '  ', location: ' UBS  Centro ' }, TODAY)).toEqual({
      familyId: 'f1',
      memberId: 'm1',
      vaccineCode: 'penta',
      vaccineName: null,
      doseKey: 'D1',
      doseLabel: '1ª dose',
      appliedOn: '2026-03-10',
      lot: null,
      location: 'UBS Centro',
      sourceRecordId: null,
      origin: 'manual',
    });
  });

  it('aceita "Não sei a data" (null ou vazio), rótulo próprio, documento de origem e origem OCR', () => {
    expect(validateDoseInput({ ...base, appliedOn: null }, TODAY).appliedOn).toBeNull();
    expect(validateDoseInput({ ...base, appliedOn: '' }, TODAY).appliedOn).toBeNull();
    const v = validateDoseInput({ ...base, doseKey: 'DU', doseLabel: 'Dose ao nascer', sourceRecordId: 'r1', origin: 'ocr' }, TODAY);
    expect(v).toMatchObject({ doseLabel: 'Dose ao nascer', sourceRecordId: 'r1', origin: 'ocr' });
  });

  it('"Outra" exige o nome da vacina', () => {
    expect(() => validateDoseInput({ ...base, vaccineCode: 'other' }, TODAY)).toThrow(expect.objectContaining({ code: 'vaccine/missing-name' }));
    expect(validateDoseInput({ ...base, vaccineCode: 'other', vaccineName: ' Herpes-zóster ' }, TODAY).vaccineName).toBe('Herpes-zóster');
    expect(() => validateDoseInput({ ...base, vaccineCode: 'other', vaccineName: 'x'.repeat(121) }, TODAY)).toThrow(
      expect.objectContaining({ code: 'vaccine/invalid-name' }),
    );
  });

  it('VPC13 e VPC15 são aceitas como código (L5)', () => {
    expect(validateDoseInput({ ...base, vaccineCode: 'pcv13' }, TODAY).vaccineCode).toBe('pcv13');
  });

  it('recusa vacina, dose e data inválidas, data futura e textos longos', () => {
    const code = (input: object) => {
      try {
        validateDoseInput(input, TODAY);
        return 'ok';
      } catch (e) {
        return (e as { code: string }).code;
      }
    };
    expect(code({ ...base, vaccineCode: 'vip' })).toBe('vaccine/invalid-code');
    expect(code({ ...base, doseKey: 'primeira' })).toBe('vaccine/invalid-dose-key');
    expect(code({ ...base, appliedOn: '2026-02-30' })).toBe('vaccine/invalid-date');
    expect(code({ ...base, appliedOn: '1899-12-31' })).toBe('vaccine/invalid-date');
    expect(code({ ...base, appliedOn: '2026-11-12' })).toBe('vaccine/future-date');
    expect(code({ ...base, appliedOn: TODAY })).toBe('ok');
    expect(code({ ...base, lot: 'x'.repeat(41) })).toBe('vaccine/invalid-lot');
    expect(code({ ...base, location: 'x'.repeat(201) })).toBe('vaccine/invalid-location');
    expect(code({ ...base, doseLabel: 'x'.repeat(41) })).toBe('vaccine/invalid-dose-label');
    expect(code({ ...base, memberId: '' })).toBe('vaccine/missing-member');
    expect(code(null as never)).toBe('vaccine/invalid-code');
  });
});

describe('validateDismissalInput (F3.7)', () => {
  const dismissal = { familyId: 'f1', memberId: 'm1', ruleId: 'varicella_d1', reason: 'had_disease' };

  it('aceita regra automática do calendário com motivo; observação vazia vira null', () => {
    expect(validateDismissalInput({ ...dismissal, note: ' ' })).toEqual({ ...dismissal, note: null });
  });

  it('recusa regra desconhecida ou não automática, motivo fora da lista e observação longa', () => {
    expect(() => validateDismissalInput({ ...dismissal, ruleId: 'x' })).toThrow(expect.objectContaining({ code: 'vaccine/invalid-rule' }));
    expect(() => validateDismissalInput({ ...dismissal, ruleId: 'rsv_pregnancy' })).toThrow(expect.objectContaining({ code: 'vaccine/invalid-rule' }));
    expect(() => validateDismissalInput({ ...dismissal, reason: 'medo' })).toThrow(expect.objectContaining({ code: 'vaccine/invalid-reason' }));
    expect(() => validateDismissalInput({ ...dismissal, note: 'x'.repeat(141) })).toThrow(expect.objectContaining({ code: 'vaccine/invalid-note' }));
  });
});
