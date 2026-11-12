import { buildMedicationInput, validateEndOn, type MedicationPlan } from './medication-input';

const base = { familyId: 'f1', memberId: 'm1', name: 'Amoxicilina', startOn: '2026-11-05' };
const build = (plan: MedicationPlan, over: Partial<typeof base & { dosage: string; instructions: string }> = {}) =>
  buildMedicationInput({ ...base, ...over, plan });
const END_BEFORE_START = 'A data de término precisa ser igual ou posterior ao início.';

describe('buildMedicationInput (F4.3, F4.5)', () => {
  it('F4.2: Amoxicilina "por 7 dias" a partir de 05/11 → fim em 11/11', () => {
    expect(build({ kind: 'days', days: 7 }).endOn).toBe('2026-11-11');
  });

  it('uso contínuo → fim nulo; "até" guarda a data escolhida', () => {
    expect(build({ kind: 'continuous' }).endOn).toBeNull();
    expect(build({ kind: 'until', endOn: '2026-11-20' }).endOn).toBe('2026-11-20');
    expect(build({ kind: 'until', endOn: '2026-11-05' }).endOn).toBe('2026-11-05');
  });

  it('monta o medicamento manual, aparando textos e trocando vazio por null', () => {
    expect(build({ kind: 'continuous' }, { name: '  Losartana   potássica ', dosage: ' 50 mg ', instructions: '   ' })).toEqual({
      familyId: 'f1',
      memberId: 'm1',
      name: 'Losartana potássica',
      dosage: '50 mg',
      instructions: null,
      startOn: '2026-11-05',
      endOn: null,
      sourceRecordId: null,
      origin: 'manual',
    });
  });

  it('F4.5: término antes do início não salva', () => {
    expect(() => build({ kind: 'until', endOn: '2026-11-04' })).toThrow(
      expect.objectContaining({ code: 'medication/end-before-start', message: END_BEFORE_START }),
    );
  });

  it('F4.3: exige nome, início válido e a escolha da duração', () => {
    expect(() => build({ kind: 'continuous' }, { name: ' ' })).toThrow(expect.objectContaining({ code: 'medication/missing-name' }));
    expect(() => build({ kind: 'continuous' }, { startOn: '05/11/2026' })).toThrow(expect.objectContaining({ code: 'medication/invalid-start' }));
    expect(() => buildMedicationInput({ ...base, plan: undefined as unknown as MedicationPlan })).toThrow(
      expect.objectContaining({ code: 'medication/missing-plan' }),
    );
    expect(() => build({ kind: 'days', days: 0 })).toThrow(expect.objectContaining({ code: 'medication/invalid-days' }));
    expect(() => build({ kind: 'until', endOn: '2026-02-30' })).toThrow(expect.objectContaining({ code: 'medication/invalid-end' }));
  });

  it('início no futuro é permitido (Começa em breve)', () => {
    expect(build({ kind: 'continuous' }, { startOn: '2026-11-12' }).startOn).toBe('2026-11-12');
  });

  it('limites de tamanho', () => {
    expect(() => build({ kind: 'continuous' }, { dosage: 'x'.repeat(61) })).toThrow(expect.objectContaining({ code: 'medication/dosage-too-long' }));
    expect(() => build({ kind: 'continuous' }, { instructions: 'x'.repeat(501) })).toThrow(
      expect.objectContaining({ code: 'medication/instructions-too-long' }),
    );
  });
});

describe('validateEndOn (F4.4, F4.5)', () => {
  it('aceita o mesmo dia do início e recusa o anterior', () => {
    expect(validateEndOn('2026-11-01', '2026-11-01')).toBe('2026-11-01');
    expect(() => validateEndOn('2026-11-01', '2026-10-31')).toThrow(END_BEFORE_START);
  });
});
