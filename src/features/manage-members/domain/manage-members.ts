import { DomainError, collapseSpaces, isValidIsoDate, toLocalIsoDate } from '@/shared/lib';
import {
  RELATIONSHIPS,
  SEXES,
  type Member,
  type MemberChanges,
  type MemberRepository,
  type NewMember,
} from '@/entities/member';

export const MEMBER_NAME_MIN = 2;
export const MEMBER_NAME_MAX = 100;
const MIN_BIRTH_DATE = '1900-01-01';

type Deps = { members: MemberRepository };

function validName(name: string): string {
  const value = collapseSpaces(name);
  if (value.length < MEMBER_NAME_MIN || value.length > MEMBER_NAME_MAX) {
    throw new DomainError('member/invalid-name', `O nome deve ter de ${MEMBER_NAME_MIN} a ${MEMBER_NAME_MAX} caracteres.`);
  }
  return value;
}

function validBirthDate(date: string | null, now: Date): string | null {
  if (date === null || date.trim() === '') return null;
  const value = date.trim();
  if (!isValidIsoDate(value) || value < MIN_BIRTH_DATE) {
    throw new DomainError('member/invalid-birth-date', 'Data de nascimento inválida.');
  }
  if (value > toLocalIsoDate(now)) {
    throw new DomainError('member/future-birth-date', 'A data de nascimento não pode estar no futuro.');
  }
  return value;
}

function validRelationship(value: string): NewMember['relationship'] {
  const found = RELATIONSHIPS.find((r) => r === value);
  if (!found) throw new DomainError('member/invalid-relationship', 'Escolha o parentesco.');
  return found;
}

function validSex(value: string): NewMember['sex'] {
  const found = SEXES.find((s) => s === value);
  if (!found) throw new DomainError('member/invalid-sex', 'Escolha uma opção de sexo.');
  return found;
}

export async function addMember({ members }: Deps, input: NewMember, now: Date = new Date()): Promise<Member> {
  if (!input.familyId) throw new DomainError('member/missing-family', 'Crie sua família antes de adicionar pessoas.');
  return members.create({
    familyId: input.familyId,
    fullName: validName(input.fullName),
    birthDate: validBirthDate(input.birthDate, now),
    relationship: validRelationship(input.relationship),
    sex: validSex(input.sex),
  });
}

/** Atualiza só os campos informados, validando cada um. Lança `member/not-found` se a pessoa não existir. */
export async function updateMember(
  { members }: Deps,
  id: string,
  changes: MemberChanges,
  now: Date = new Date(),
): Promise<Member> {
  const existing = await members.getById(id);
  if (!existing) throw new DomainError('member/not-found', 'Pessoa não encontrada.');
  const valid: MemberChanges = {};
  if (changes.fullName !== undefined) valid.fullName = validName(changes.fullName);
  if (changes.birthDate !== undefined) valid.birthDate = validBirthDate(changes.birthDate, now);
  if (changes.relationship !== undefined) valid.relationship = validRelationship(changes.relationship);
  if (changes.sex !== undefined) valid.sex = validSex(changes.sex);
  if (Object.keys(valid).length === 0) return existing;
  return members.update(id, valid);
}

/** Remove a pessoa e, pela porta, seus registros e anexos (irreversível: a tela deve confirmar). */
export async function removeMember({ members }: Deps, id: string): Promise<void> {
  if (!(await members.getById(id))) throw new DomainError('member/not-found', 'Pessoa não encontrada.');
  await members.remove(id);
}
