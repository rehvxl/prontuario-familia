import { formatAxisDate, formatDecimal, formatMonthYear, formatShortDate } from './format';

describe('formatDecimal', () => {
  it('vírgula decimal', () => {
    expect(formatDecimal('7.4')).toBe('7,4');
    expect(formatDecimal(7.4)).toBe('7,4');
    expect(formatDecimal('13.20')).toBe('13,20');
    expect(formatDecimal(1.02)).toBe('1,02');
  });

  it('ponto de milhar', () => {
    expect(formatDecimal(250000)).toBe('250.000');
    expect(formatDecimal(1500)).toBe('1.500');
    expect(formatDecimal(1234.5)).toBe('1.234,5');
    expect(formatDecimal(142)).toBe('142');
    expect(formatDecimal(-1234.5)).toBe('-1.234,5');
  });

  it('entrada não numérica volta igual', () => {
    expect(formatDecimal('abc')).toBe('abc');
    expect(formatDecimal(Number.NaN)).toBe('NaN');
  });
});

describe('datas', () => {
  it('formatShortDate', () => {
    expect(formatShortDate('2026-10-12')).toBe('12 de out. de 2026');
    expect(formatShortDate('2026-11-01')).toBe('1 de nov. de 2026');
    expect(formatShortDate('2026-10')).toBe('2026-10');
    expect(formatShortDate('2026-13-01')).toBe('2026-13-01');
  });

  it('formatMonthYear', () => {
    expect(formatMonthYear('2026-10-12')).toBe('outubro de 2026');
    expect(formatMonthYear('2025-03')).toBe('março de 2025');
    expect(formatMonthYear('x')).toBe('x');
  });

  it('formatAxisDate', () => {
    expect(formatAxisDate('2025-03-14')).toBe('mar./25');
    expect(formatAxisDate('2026-11-11')).toBe('nov./26');
    expect(formatAxisDate('')).toBe('');
  });
});
