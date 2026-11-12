import { computeFlag } from '@/entities/measurement';
import { parseDecimal, validateLabInput, validateVitalInput } from './validate';

const now = new Date(2026, 10, 11, 10, 0); // hoje = 11/11/2026 (dia local)
const owner = { familyId: 'f1', memberId: 'm1' };

describe('parseDecimal', () => {
  it('lê número pt-BR', () => {
    expect(parseDecimal('13,2')).toBe(13.2);
    expect(parseDecimal(' 69,9 ')).toBe(69.9);
    expect(parseDecimal('1.234,5')).toBe(1234.5);
    expect(parseDecimal('250.000')).toBe(250000);
    expect(parseDecimal('7.4')).toBe(7.4);
    expect(parseDecimal('120')).toBe(120);
    expect(parseDecimal(7.4)).toBe(7.4);
  });

  it('recusa o que não é número', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('1,2,3')).toBeNull();
    expect(parseDecimal('12a')).toBeNull();
    expect(parseDecimal(Number.NaN)).toBeNull();
    expect(parseDecimal(null)).toBeNull();
  });
});

describe('validateLabInput (F2.5, F2.6)', () => {
  const lab = (over: Record<string, unknown> = {}) => ({ ...owner, code: 'glucose_fasting', value: '99', referenceLow: '70', referenceHigh: '99', takenOn: '2026-10-12', ...over });
  const flagOf = (over: Record<string, unknown>) => {
    const m = validateLabInput(lab(over), now);
    return computeFlag(m.value, m.referenceLow, m.referenceHigh);
  };

  it('F2.4: glicose 99 com faixa 70–99 → dentro; 100 → acima; 69,9 → abaixo', () => {
    expect(flagOf({ value: '99' })).toBe('in');
    expect(flagOf({ value: '100' })).toBe('high');
    expect(flagOf({ value: '69,9' })).toBe('low');
  });

  it('F2.4: HDL 38 com "> 40" → abaixo; LDL 120 só com texto → sem faixa no laudo', () => {
    expect(flagOf({ code: 'hdl', value: '38', referenceLow: '40', referenceHigh: '' })).toBe('low');
    const ldl = validateLabInput(lab({ code: 'ldl', value: '120', referenceLow: null, referenceHigh: null, referenceText: 'Desejável: < 100' }), now);
    expect(ldl.referenceText).toBe('Desejável: < 100');
    expect(computeFlag(ldl.value, ldl.referenceLow, ldl.referenceHigh)).toBe('none');
  });

  it('monta a medição manual com o rótulo e a unidade do catálogo', () => {
    expect(validateLabInput(lab({ unit: '', sourceRecordId: 'r1', note: '  em jejum de 12 h ' }), now)).toEqual({
      ...owner,
      kind: 'lab',
      code: 'glucose_fasting',
      label: 'Glicose em jejum',
      value: 99,
      value2: null,
      unit: 'mg/dL',
      referenceLow: 70,
      referenceHigh: 99,
      referenceText: null,
      takenOn: '2026-10-12',
      takenAt: null,
      context: null,
      note: 'em jejum de 12 h',
      sourceRecordId: 'r1',
      origin: 'manual',
    });
  });

  it('a unidade sugerida é editável', () => {
    expect(validateLabInput(lab({ unit: ' mmol/L ' }), now).unit).toBe('mmol/L');
  });

  it('"Outro" exige o nome do laudo', () => {
    const other = validateLabInput(lab({ code: 'other', label: '  Homocisteína  total ', unit: 'µmol/L' }), now);
    expect(other).toMatchObject({ code: 'other', label: 'Homocisteína total', unit: 'µmol/L' });
    expect(() => validateLabInput(lab({ code: 'other', label: '  ' }), now)).toThrow(expect.objectContaining({ code: 'measurement/missing-name' }));
  });

  it('exame fora do catálogo sem ser "Outro" é recusado', () => {
    expect(() => validateLabInput(lab({ code: 'bp' }), now)).toThrow(expect.objectContaining({ code: 'measurement/missing-exam' }));
    expect(() => validateLabInput(lab({ code: '' }), now)).toThrow(expect.objectContaining({ code: 'measurement/missing-exam' }));
  });

  it('F2.6: valor que não é número > 0 não salva e pede "Digite um número, por exemplo 13,2."', () => {
    for (const value of ['', 'abc', '0', '-1', '0,0', null, undefined]) {
      expect(() => validateLabInput(lab({ value }), now)).toThrow(
        expect.objectContaining({ code: 'measurement/invalid-value', message: 'Digite um número, por exemplo 13,2.' }),
      );
    }
    expect(validateLabInput(lab({ value: '13,2' }), now).value).toBe(13.2);
  });

  it('faixa opcional: número inválido ou mínimo > máximo são recusados', () => {
    expect(() => validateLabInput(lab({ referenceLow: 'x' }), now)).toThrow(expect.objectContaining({ code: 'measurement/invalid-reference' }));
    expect(() => validateLabInput(lab({ referenceLow: '100', referenceHigh: '99' }), now)).toThrow(expect.objectContaining({ code: 'measurement/invalid-range' }));
    const noRange = validateLabInput(lab({ referenceLow: '', referenceHigh: undefined }), now);
    expect([noRange.referenceLow, noRange.referenceHigh]).toEqual([null, null]);
  });

  it('data válida, não futura', () => {
    expect(validateLabInput(lab({ takenOn: '2026-11-11' }), now).takenOn).toBe('2026-11-11');
    expect(() => validateLabInput(lab({ takenOn: '2026-11-12' }), now)).toThrow(expect.objectContaining({ code: 'measurement/future-date' }));
    expect(() => validateLabInput(lab({ takenOn: '2026-02-30' }), now)).toThrow(expect.objectContaining({ code: 'measurement/invalid-date' }));
  });

  it('observação até 140 caracteres', () => {
    expect(validateLabInput(lab({ note: 'a'.repeat(140) }), now).note).toHaveLength(140);
    expect(() => validateLabInput(lab({ note: 'a'.repeat(141) }), now)).toThrow(expect.objectContaining({ code: 'measurement/note-too-long' }));
  });

  it('sem pessoa ou entrada que não é objeto', () => {
    expect(() => validateLabInput(lab({ memberId: '' }), now)).toThrow(expect.objectContaining({ code: 'measurement/missing-member' }));
    expect(() => validateLabInput(null, now)).toThrow(expect.objectContaining({ code: 'measurement/missing-member' }));
  });
});

describe('validateVitalInput (F5.1–F5.3)', () => {
  const vital = (over: Record<string, unknown> = {}) => ({ ...owner, code: 'bp', value: '120', value2: '80', takenOn: '2026-11-11', takenAt: '08:30', ...over });

  it('pressão: sistólica e diastólica em mmHg, sem faixa, origem manual', () => {
    expect(validateVitalInput(vital(), now)).toEqual({
      value: {
        ...owner,
        kind: 'vital',
        code: 'bp',
        label: 'Pressão arterial',
        value: 120,
        value2: 80,
        unit: 'mmHg',
        referenceLow: null,
        referenceHigh: null,
        referenceText: null,
        takenOn: '2026-11-11',
        takenAt: '08:30',
        context: null,
        note: null,
        sourceRecordId: null,
        origin: 'manual',
      },
      needsConfirmation: false,
    });
  });

  it('F5.2: sistólica ≤ diastólica não salva', () => {
    const message = 'A primeira pressão (sistólica) costuma ser maior que a segunda (diastólica). Confira os números.';
    expect(() => validateVitalInput(vital({ value: '80', value2: '120' }), now)).toThrow(expect.objectContaining({ code: 'measurement/bp-order', message }));
    expect(() => validateVitalInput(vital({ value: '90', value2: '90' }), now)).toThrow(expect.objectContaining({ code: 'measurement/bp-order' }));
  });

  it('pressão sem diastólica não salva', () => {
    expect(() => validateVitalInput(vital({ value2: '' }), now)).toThrow(expect.objectContaining({ code: 'measurement/invalid-value' }));
  });

  const confirm = (over: Record<string, unknown>) => validateVitalInput(vital(over), now).needsConfirmation;

  it('F5.3: PAS 50–300 e PAD 30–200 (limites inclusivos)', () => {
    expect(confirm({ value: '50', value2: '30' })).toBe(false);
    expect(confirm({ value: '300', value2: '200' })).toBe(false);
    expect(confirm({ value: '49', value2: '30' })).toBe(true);
    expect(confirm({ value: '301', value2: '80' })).toBe(true);
    expect(confirm({ value: '120', value2: '29' })).toBe(true);
    expect(confirm({ value: '250', value2: '201' })).toBe(true);
  });

  it('F5.3: glicemia 10–800', () => {
    const g = (value: string) => confirm({ code: 'glucose_capillary', value, value2: null });
    expect([g('10'), g('800'), g('9'), g('801')]).toEqual([false, false, true, true]);
  });

  it('F5.3: peso 0,5–400', () => {
    const w = (value: string) => confirm({ code: 'weight', value, value2: null });
    expect([w('0,5'), w('400'), w('0,4'), w('400,1')]).toEqual([false, false, true, true]);
  });

  it('F5.3: altura 30–250', () => {
    const h = (value: string) => confirm({ code: 'height', value, value2: null });
    expect([h('30'), h('250'), h('29'), h('251')]).toEqual([false, false, true, true]);
  });

  it('peso com 1 casa decimal, em kg', () => {
    expect(validateVitalInput(vital({ code: 'weight', value: '72,46', value2: null }), now).value).toMatchObject({ value: 72.5, value2: null, unit: 'kg', label: 'Peso' });
  });

  it('momento só na glicemia capilar; diastólica só na pressão', () => {
    const g = validateVitalInput(vital({ code: 'glucose_capillary', value: '98', value2: '70', context: 'fasting' }), now).value;
    expect(g).toMatchObject({ context: 'fasting', value2: null, unit: 'mg/dL' });
    expect(validateVitalInput(vital({ code: 'glucose_capillary', value: '98', context: 'x' }), now).value.context).toBeNull();
    expect(validateVitalInput(vital({ context: 'fasting' }), now).value.context).toBeNull();
  });

  it('valor que não é número > 0 é recusado', () => {
    expect(() => validateVitalInput(vital({ code: 'height', value: '0', value2: null }), now)).toThrow(
      expect.objectContaining({ message: 'Digite um número, por exemplo 13,2.' }),
    );
  });

  it('hora HH:mm opcional e data não futura', () => {
    expect(validateVitalInput(vital({ takenAt: '' }), now).value.takenAt).toBeNull();
    expect(() => validateVitalInput(vital({ takenAt: '24:00' }), now)).toThrow(expect.objectContaining({ code: 'measurement/invalid-time' }));
    expect(() => validateVitalInput(vital({ takenOn: '2026-11-12' }), now)).toThrow(expect.objectContaining({ code: 'measurement/future-date' }));
  });

  it('tipo desconhecido é recusado', () => {
    expect(() => validateVitalInput(vital({ code: 'hba1c' }), now)).toThrow(expect.objectContaining({ code: 'measurement/missing-vital' }));
  });
});
