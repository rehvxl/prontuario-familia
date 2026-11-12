import { RELATIONSHIPS } from './member';
import { calculateAge, formatAge } from './age';
import { RELATIONSHIP_LABELS, relationshipLabel } from './labels';

const today = new Date(2026, 10, 11); // 11/11/2026

describe('calculateAge', () => {
  it('conta anos completos, respeitando o aniversário', () => {
    expect(calculateAge('1990-11-11', today)).toBe(36); // faz hoje
    expect(calculateAge('1990-11-12', today)).toBe(35); // amanhã
    expect(calculateAge('1990-01-01', today)).toBe(36);
  });
  it('devolve null para data futura ou inválida', () => {
    expect(calculateAge('2027-01-01', today)).toBeNull();
    expect(calculateAge('abc', today)).toBeNull();
  });
});

describe('formatAge', () => {
  it('usa anos a partir de 2 anos, "1 ano" até 23 meses e meses abaixo de 1 ano', () => {
    expect(formatAge('2020-05-01', today)).toBe('6 anos');
    expect(formatAge('2024-11-11', today)).toBe('2 anos');
    expect(formatAge('2025-06-01', today)).toBe('1 ano');
    expect(formatAge('2026-03-11', today)).toBe('8 meses');
    expect(formatAge('2026-10-11', today)).toBe('1 mês');
    expect(formatAge('2026-11-05', today)).toBe('recém-nascido');
  });
  it('não conta o mês incompleto', () => {
    expect(formatAge('2026-03-12', today)).toBe('7 meses');
  });
  it('devolve null sem data', () => {
    expect(formatAge(null, today)).toBeNull();
  });
});

it('rotula todos os parentescos', () => {
  expect(RELATIONSHIPS.every((r) => RELATIONSHIP_LABELS[r].length > 0)).toBe(true);
  expect(RELATIONSHIP_LABELS.self).toBe('Eu');
});

it('rotula o parentesco pelo sexo quando informado e usa o neutro quando não', () => {
  expect(relationshipLabel('child', 'female')).toBe('Filha');
  expect(relationshipLabel('child', 'male')).toBe('Filho');
  expect(relationshipLabel('parent', 'female')).toBe('Mãe');
  expect(relationshipLabel('parent', 'male')).toBe('Pai');
  expect(relationshipLabel('sibling', 'female')).toBe('Irmã');
  expect(relationshipLabel('grandparent', 'male')).toBe('Avô');
  expect(relationshipLabel('spouse', 'female')).toBe('Cônjuge');
  expect(relationshipLabel('child', 'unspecified')).toBe('Filho(a)');
  expect(relationshipLabel('parent', 'other')).toBe('Pai/Mãe');
  expect(relationshipLabel('sibling')).toBe('Irmão/Irmã');
});
