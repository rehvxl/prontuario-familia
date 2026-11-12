import type { Relationship, Sex } from './member';

export const RELATIONSHIP_LABELS: Readonly<Record<Relationship, string>> = {
  self: 'Eu',
  spouse: 'Cônjuge',
  child: 'Filho(a)',
  parent: 'Pai/Mãe',
  sibling: 'Irmão/Irmã',
  grandparent: 'Avô/Avó',
  other: 'Outro',
};

export const SEX_LABELS: Readonly<Record<Sex, string>> = {
  female: 'Feminino',
  male: 'Masculino',
  other: 'Outro',
  unspecified: 'Prefiro não informar',
};

// O neutro ("Filho(a)") é só para quem não informou o sexo; com ele, o parentesco sai como se diz.
const BY_SEX: Partial<Record<Relationship, Readonly<Record<'female' | 'male', string>>>> = {
  child: { female: 'Filha', male: 'Filho' },
  parent: { female: 'Mãe', male: 'Pai' },
  sibling: { female: 'Irmã', male: 'Irmão' },
  grandparent: { female: 'Avó', male: 'Avô' },
};

/** Parentesco pelo sexo da pessoa quando informado ("Filha", "Pai"); senão, o rótulo neutro. */
export const relationshipLabel = (r: Relationship, sex?: Sex): string =>
  (sex === 'female' || sex === 'male' ? BY_SEX[r]?.[sex] : undefined) ?? RELATIONSHIP_LABELS[r];
export const sexLabel = (s: Sex): string => SEX_LABELS[s];
