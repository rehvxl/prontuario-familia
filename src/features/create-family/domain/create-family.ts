import { DomainError, collapseSpaces } from '@/shared/lib';
import type { Family, FamilyRepository } from '@/entities/family';

export const FAMILY_NAME_MIN = 2;
export const FAMILY_NAME_MAX = 60;

export function normalizeFamilyName(name: string): string {
  const value = collapseSpaces(name);
  if (value.length < FAMILY_NAME_MIN || value.length > FAMILY_NAME_MAX) {
    throw new DomainError('family/invalid-name', `O nome da família deve ter de ${FAMILY_NAME_MIN} a ${FAMILY_NAME_MAX} caracteres.`);
  }
  return value;
}

/** Cria a família do usuário (1 por conta no MVP). Lança `family/already-exists` se já houver uma. */
export async function createFamily({ families }: { families: FamilyRepository }, name: string): Promise<Family> {
  const normalized = normalizeFamilyName(name);
  if (await families.getMyFamily()) throw new DomainError('family/already-exists', 'Você já tem uma família criada.');
  return families.createFamily(normalized);
}
