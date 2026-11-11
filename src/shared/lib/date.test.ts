import { isValidIsoDate, toLocalIsoDate } from './date';

describe('isValidIsoDate', () => {
  it('aceita datas reais, inclusive 29/02 em ano bissexto', () => {
    expect(isValidIsoDate('2026-11-11')).toBe(true);
    expect(isValidIsoDate('2028-02-29')).toBe(true);
  });
  it('rejeita datas que não existem e formatos errados', () => {
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('2027-02-29')).toBe(false);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('11/11/2026')).toBe(false);
    expect(isValidIsoDate('2026-1-1')).toBe(false);
  });
});

describe('toLocalIsoDate', () => {
  it('usa o dia local, com zeros à esquerda', () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
