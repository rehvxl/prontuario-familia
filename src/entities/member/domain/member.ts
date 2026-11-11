export const RELATIONSHIPS = ['self', 'spouse', 'child', 'parent', 'sibling', 'grandparent', 'other'] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export const SEXES = ['female', 'male', 'other', 'unspecified'] as const;
export type Sex = (typeof SEXES)[number];

/** Pessoa da família cujo histórico de saúde é guardado (não precisa ter conta no app). */
export interface Member {
  id: string;
  familyId: string;
  fullName: string;
  birthDate: string | null; // YYYY-MM-DD
  relationship: Relationship;
  sex: Sex;
  createdAt: string;
}

export interface NewMember {
  familyId: string;
  fullName: string;
  birthDate: string | null;
  relationship: Relationship;
  sex: Sex;
}

export type MemberChanges = Partial<Omit<NewMember, 'familyId'>>;

export interface MemberRepository {
  listByFamily(familyId: string): Promise<Member[]>;
  getById(id: string): Promise<Member | null>;
  create(input: NewMember): Promise<Member>;
  update(id: string, changes: MemberChanges): Promise<Member>;
  /** Remove o membro, seus registros e anexos. */
  remove(id: string): Promise<void>;
}
