import { File, Paths } from 'expo-file-system';
import { LOCAL_COLLECTIONS, type LocalDb, clearLocalFiles } from '@/shared/lib';
import { createMemoryDb } from '@/shared/lib/testing';
import type { MemberRepository } from '../domain/member';
import { createLocalMemberRepository } from './local-member-repository';

const input = (over = {}) => ({
  familyId: 'f1',
  fullName: 'Ana Souza',
  birthDate: '1990-05-10',
  relationship: 'self' as const,
  sex: 'female' as const,
  ...over,
});

describe('createLocalMemberRepository', () => {
  let db: LocalDb;
  let repo: MemberRepository;
  beforeEach(() => {
    clearLocalFiles();
    db = createMemoryDb();
    repo = createLocalMemberRepository(db);
  });

  it('cria, busca e lista por família', async () => {
    const ana = await repo.create(input());
    await repo.create(input({ fullName: 'Outro', familyId: 'f2' }));
    expect(await repo.getById(ana.id)).toEqual(ana);
    expect((await repo.listByFamily('f1')).map((m) => m.fullName)).toEqual(['Ana Souza']);
  });

  it('atualiza só os campos informados e falha para id inexistente', async () => {
    const ana = await repo.create(input());
    const updated = await repo.update(ana.id, { fullName: 'Ana Maria Souza', birthDate: null });
    expect(updated).toMatchObject({ id: ana.id, fullName: 'Ana Maria Souza', birthDate: null, relationship: 'self' });
    await expect(repo.update('nada', { fullName: 'x' })).rejects.toMatchObject({ code: 'member/not-found' });
  });

  it('remover apaga a pessoa, seus registros e os arquivos dos anexos, preservando os dos outros', async () => {
    const ana = await repo.create(input());
    const bia = await repo.create(input({ fullName: 'Bia' }));
    const mkFile = (path: string) => {
      const f = new File(Paths.document, 'health-files', ...path.split('/'));
      new File(Paths.document, 'health-files', ...path.split('/').slice(0, -1), '.keep').parentDirectory.create({ intermediates: true, idempotent: true });
      f.create({ overwrite: true });
      return f;
    };
    const anaFile = mkFile('f1/r1/a.pdf');
    const biaFile = mkFile('f1/r2/b.pdf');
    await db.put(LOCAL_COLLECTIONS.records, 'r1', { id: 'r1', memberId: ana.id, attachments: [{ storagePath: 'f1/r1/a.pdf' }] });
    await db.put(LOCAL_COLLECTIONS.records, 'r2', { id: 'r2', memberId: bia.id, attachments: [{ storagePath: 'f1/r2/b.pdf' }] });

    await repo.remove(ana.id);

    expect(await repo.getById(ana.id)).toBeNull();
    expect(await db.get(LOCAL_COLLECTIONS.records, 'r1')).toBeNull();
    expect(anaFile.exists).toBe(false);
    expect(await db.get(LOCAL_COLLECTIONS.records, 'r2')).not.toBeNull();
    expect(biaFile.exists).toBe(true);
    expect(await repo.getById(bia.id)).not.toBeNull();
  });

  it('remover pessoa inexistente falha', async () => {
    await expect(repo.remove('nada')).rejects.toMatchObject({ code: 'member/not-found' });
  });

  it('remover a pessoa apaga em cascata medições, doses, medicamentos e dispensas dela, preservando os dos outros', async () => {
    const ana = await repo.create(input());
    const bia = await repo.create(input({ fullName: 'Bia' }));
    const health = [
      LOCAL_COLLECTIONS.measurements,
      LOCAL_COLLECTIONS.vaccineDoses,
      LOCAL_COLLECTIONS.medications,
      LOCAL_COLLECTIONS.vaccineRuleDismissals,
    ];
    for (const c of health) {
      await db.put(c, `${c}-ana`, { id: `${c}-ana`, familyId: 'f1', memberId: ana.id });
      await db.put(c, `${c}-bia`, { id: `${c}-bia`, familyId: 'f1', memberId: bia.id });
    }

    await repo.remove(ana.id);

    for (const c of health) {
      expect((await db.list<{ id: string }>(c)).map((d) => d.id)).toEqual([`${c}-bia`]);
    }
  });
});
