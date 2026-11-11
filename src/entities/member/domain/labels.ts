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

export const relationshipLabel = (r: Relationship): string => RELATIONSHIP_LABELS[r];
export const sexLabel = (s: Sex): string => SEX_LABELS[s];
