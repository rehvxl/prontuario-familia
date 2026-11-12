import { medicationEndOn } from './duration';

describe('medicationEndOn (R6)', () => {
  it('7 dias a partir de 05/11/2026 terminam em 11/11/2026', () => {
    expect(medicationEndOn('2026-11-05', { kind: 'days', days: 7 })).toBe('2026-11-11');
  });

  it('1 dia termina no próprio dia de início', () => {
    expect(medicationEndOn('2026-11-11', { kind: 'days', days: 1 })).toBe('2026-11-11');
  });

  it('atravessa mês, ano e fevereiro', () => {
    expect(medicationEndOn('2026-11-25', { kind: 'days', days: 10 })).toBe('2026-12-04');
    expect(medicationEndOn('2026-12-30', { kind: 'days', days: 5 })).toBe('2027-01-03');
    expect(medicationEndOn('2028-02-27', { kind: 'days', days: 3 })).toBe('2028-02-29');
  });

  it('uso contínuo → null', () => {
    expect(medicationEndOn('2026-11-05', { kind: 'continuous' })).toBeNull();
  });

  it('sem duração → undefined (a pessoa escolhe)', () => {
    expect(medicationEndOn('2026-11-05', { kind: 'unknown' })).toBeUndefined();
  });

  it('N inválido ou data inválida → undefined', () => {
    expect(medicationEndOn('2026-11-05', { kind: 'days', days: 0 })).toBeUndefined();
    expect(medicationEndOn('2026-11-05', { kind: 'days', days: 2.5 })).toBeUndefined();
    expect(medicationEndOn('05/11/2026', { kind: 'days', days: 7 })).toBeUndefined();
  });
});
