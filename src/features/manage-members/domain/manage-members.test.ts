import type { Member, MemberRepository, NewMember } from '@/entities/member';
import { addMember, removeMember, updateMember } from './manage-members';

const now = new Date(2026, 10, 11);
const valid: NewMember = { familyId: 'f1', fullName: 'Ana Souza', birthDate: '1990-05-10', relationship: 'self', sex: 'female' };

function fakeMembers(initial: Member[] = []) {
  const store = new Map(initial.map((m) => [m.id, m]));
  const log: string[] = [];
  const repo: MemberRepository = {
    listByFamily: async () => [...store.values()],
    getById: async (id) => store.get(id) ?? null,
    create: async (input) => {
      const m: Member = { ...input, id: `m${store.size + 1}`, createdAt: 'x' };
      store.set(m.id, m);
      log.push('create');
      return m;
    },
    update: async (id, changes) => {
      const m = { ...store.get(id)!, ...changes };
      store.set(id, m);
      log.push(`update:${JSON.stringify(changes)}`);
      return m;
    },
    remove: async (id) => {
      store.delete(id);
      log.push('remove');
    },
  };
  return { repo, log };
}

const existing: Member = { ...valid, id: 'm1', createdAt: 'x' };

describe('addMember', () => {
  it('cria com nome normalizado', async () => {
    const { repo } = fakeMembers();
    const m = await addMember({ members: repo }, { ...valid, fullName: '  Ana   Souza ' }, now);
    expect(m.fullName).toBe('Ana Souza');
  });

  it('data de nascimento é opcional (vazia vira null) mas, se vier, tem de existir e não ser futura', async () => {
    const { repo } = fakeMembers();
    expect((await addMember({ members: repo }, { ...valid, birthDate: '' }, now)).birthDate).toBeNull();
    expect((await addMember({ members: repo }, { ...valid, birthDate: null }, now)).birthDate).toBeNull();
    await expect(addMember({ members: repo }, { ...valid, birthDate: '2026-02-30' }, now)).rejects.toMatchObject({ code: 'member/invalid-birth-date' });
    await expect(addMember({ members: repo }, { ...valid, birthDate: '1850-01-01' }, now)).rejects.toMatchObject({ code: 'member/invalid-birth-date' });
    await expect(addMember({ members: repo }, { ...valid, birthDate: '2026-11-12' }, now)).rejects.toMatchObject({ code: 'member/future-birth-date' });
    expect((await addMember({ members: repo }, { ...valid, birthDate: '2026-11-11' }, now)).birthDate).toBe('2026-11-11');
  });

  it('valida nome, parentesco, sexo e família sem chamar o repositório', async () => {
    const { repo, log } = fakeMembers();
    await expect(addMember({ members: repo }, { ...valid, fullName: 'A' }, now)).rejects.toMatchObject({ code: 'member/invalid-name' });
    await expect(addMember({ members: repo }, { ...valid, fullName: 'x'.repeat(101) }, now)).rejects.toMatchObject({ code: 'member/invalid-name' });
    await expect(addMember({ members: repo }, { ...valid, relationship: 'amigo' as never }, now)).rejects.toMatchObject({ code: 'member/invalid-relationship' });
    await expect(addMember({ members: repo }, { ...valid, sex: 'x' as never }, now)).rejects.toMatchObject({ code: 'member/invalid-sex' });
    await expect(addMember({ members: repo }, { ...valid, familyId: '' }, now)).rejects.toMatchObject({ code: 'member/missing-family' });
    expect(log).toEqual([]);
  });
});

describe('updateMember', () => {
  it('envia só os campos alterados, já validados', async () => {
    const { repo, log } = fakeMembers([existing]);
    const m = await updateMember({ members: repo }, 'm1', { fullName: '  Ana  Maria ', birthDate: null }, now);
    expect(m).toMatchObject({ fullName: 'Ana Maria', birthDate: null });
    expect(log).toEqual(['update:{"fullName":"Ana Maria","birthDate":null}']);
  });
  it('valida os campos informados', async () => {
    const { repo, log } = fakeMembers([existing]);
    await expect(updateMember({ members: repo }, 'm1', { fullName: ' ' }, now)).rejects.toMatchObject({ code: 'member/invalid-name' });
    await expect(updateMember({ members: repo }, 'm1', { birthDate: '2999-01-01' }, now)).rejects.toMatchObject({ code: 'member/future-birth-date' });
    expect(log).toEqual([]);
  });
  it('sem mudanças devolve a pessoa sem gravar; id inexistente falha', async () => {
    const { repo, log } = fakeMembers([existing]);
    expect(await updateMember({ members: repo }, 'm1', {}, now)).toEqual(existing);
    expect(log).toEqual([]);
    await expect(updateMember({ members: repo }, 'nada', { fullName: 'Zé' }, now)).rejects.toMatchObject({ code: 'member/not-found' });
  });
});

describe('removeMember', () => {
  it('remove pessoa existente e falha para inexistente', async () => {
    const { repo, log } = fakeMembers([existing]);
    await removeMember({ members: repo }, 'm1');
    expect(log).toEqual(['remove']);
    await expect(removeMember({ members: repo }, 'm1')).rejects.toMatchObject({ code: 'member/not-found' });
    expect(log).toEqual(['remove']);
  });
});
