import { formatDate, parseISODate, toISODate } from './date';
import { categoricalIndexFor, getInitials } from './identity';

describe('datas', () => {
  it('formata em pt-BR sem trocar o dia por fuso', () => {
    expect(formatDate('2024-03-12')).toBe('12 de março de 2024');
    expect(formatDate('2024-03-12', 'short')).toBe('12 mar. 2024');
    expect(formatDate('2024-03-02', 'numeric')).toBe('02/03/2024');
    expect(formatDate('2024-12-01', 'monthYear')).toBe('dezembro de 2024');
  });
  it('rejeita datas inválidas', () => {
    expect(parseISODate('2024-02-30')).toBeNull();
    expect(parseISODate('12/03/2024')).toBeNull();
    expect(formatDate(null)).toBe('');
  });
  it('ida e volta Date ↔ ISO', () => {
    expect(toISODate(new Date(2023, 0, 5))).toBe('2023-01-05');
  });
});

describe('identidade', () => {
  it('gera iniciais ignorando preposições', () => {
    expect(getInitials('Ana Paula da Silva')).toBe('AS');
    expect(getInitials('  carlos ')).toBe('C');
    expect(getInitials('élio de souza')).toBe('ÉS');
  });
  it('cor determinística e dentro da paleta', () => {
    expect(categoricalIndexFor('member-1')).toBe(categoricalIndexFor('member-1'));
    for (const id of ['a', 'b', 'c', 'uuid-123', '']) {
      const i = categoricalIndexFor(id);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(7);
    }
  });
});
