import { computeFlag } from './reference';

describe('computeFlag (R1)', () => {
  it('valor igual ao limite fica dentro da faixa', () => {
    expect(computeFlag(13, 13, 17)).toBe('in');
    expect(computeFlag(17, 13, 17)).toBe('in');
  });

  it('abaixo do piso e acima do teto', () => {
    expect(computeFlag(12.9, 13, 17)).toBe('low');
    expect(computeFlag(17.1, 13, 17)).toBe('high');
  });

  it('só piso', () => {
    expect(computeFlag(39, 40, null)).toBe('low');
    expect(computeFlag(40, 40, null)).toBe('in');
    expect(computeFlag(1000, 40, null)).toBe('in');
  });

  it('só teto', () => {
    expect(computeFlag(5.7, null, 5.7)).toBe('in');
    expect(computeFlag(7.4, null, 5.7)).toBe('high');
    expect(computeFlag(0, null, 5.7)).toBe('in');
  });

  it('sem limite numérico → none', () => {
    expect(computeFlag(7.4, null, null)).toBe('none');
  });
});
