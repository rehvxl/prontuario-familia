import type { Family, FamilyRepository } from '@/entities/family';
import { createFamily, normalizeFamilyName } from './create-family';

const fam = (name: string): Family => ({ id: 'f1', name, createdAt: 'x', myRole: 'owner' });

function fakeFamilies(existing: Family | null = null) {
  const created: string[] = [];
  const repo: FamilyRepository = {
    getMyFamily: async () => existing,
    createFamily: async (name) => {
      created.push(name);
      return fam(name);
    },
    rename: async (_, name) => fam(name),
  };
  return { repo, created };
}

describe('normalizeFamilyName', () => {
  it('apara e colapsa espaços', () => {
    expect(normalizeFamilyName('  Família   Souza ')).toBe('Família Souza');
  });
  it('aceita os limites 2 e 60 e recusa 1, 61 e vazio', () => {
    expect(normalizeFamilyName('Oi')).toBe('Oi');
    expect(normalizeFamilyName('a'.repeat(60))).toHaveLength(60);
    for (const bad of ['', ' a ', 'a'.repeat(61)]) {
      expect(() => normalizeFamilyName(bad)).toThrow(/2 a 60 caracteres/);
    }
  });
});

describe('createFamily', () => {
  it('cria com o nome normalizado', async () => {
    const { repo, created } = fakeFamilies();
    const family = await createFamily({ families: repo }, '  Família   Souza ');
    expect(family.name).toBe('Família Souza');
    expect(created).toEqual(['Família Souza']);
  });
  it('não cria se o nome é inválido', async () => {
    const { repo, created } = fakeFamilies();
    await expect(createFamily({ families: repo }, 'x')).rejects.toMatchObject({ code: 'family/invalid-name' });
    expect(created).toEqual([]);
  });
  it('MVP: uma família por conta', async () => {
    const { repo, created } = fakeFamilies(fam('Já existe'));
    await expect(createFamily({ families: repo }, 'Outra')).rejects.toMatchObject({ code: 'family/already-exists' });
    expect(created).toEqual([]);
  });
});
