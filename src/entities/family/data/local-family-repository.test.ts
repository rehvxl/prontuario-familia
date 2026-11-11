import { LOCAL_COLLECTIONS, LOCAL_SESSION_ID } from '@/shared/lib';
import { createMemoryDb } from '@/shared/lib/testing';
import { createLocalFamilyRepository } from './local-family-repository';

const login = (db: ReturnType<typeof createMemoryDb>, userId: string) =>
  db.put(LOCAL_COLLECTIONS.session, LOCAL_SESSION_ID, { userId });

describe('createLocalFamilyRepository', () => {
  it('sem sessão, qualquer operação falha com auth/unauthenticated', async () => {
    const repo = createLocalFamilyRepository(createMemoryDb());
    await expect(repo.getMyFamily()).rejects.toMatchObject({ code: 'auth/unauthenticated' });
    await expect(repo.createFamily('Silva')).rejects.toMatchObject({ code: 'auth/unauthenticated' });
  });

  it('cria a família do usuário como owner e a devolve em getMyFamily', async () => {
    const db = createMemoryDb();
    await login(db, 'u1');
    const repo = createLocalFamilyRepository(db);
    expect(await repo.getMyFamily()).toBeNull();
    const family = await repo.createFamily('Família Silva');
    expect(family).toMatchObject({ name: 'Família Silva', myRole: 'owner' });
    expect(await repo.getMyFamily()).toEqual(family);
  });

  it('isola famílias por usuário e impede uma segunda família na mesma conta', async () => {
    const db = createMemoryDb();
    const repo = createLocalFamilyRepository(db);
    await login(db, 'u1');
    await repo.createFamily('Silva');
    await expect(repo.createFamily('Outra')).rejects.toMatchObject({ code: 'family/already-exists' });
    await login(db, 'u2');
    expect(await repo.getMyFamily()).toBeNull();
  });

  it('renomeia a própria família e recusa a de outro usuário', async () => {
    const db = createMemoryDb();
    const repo = createLocalFamilyRepository(db);
    await login(db, 'u1');
    const family = await repo.createFamily('Silva');
    expect((await repo.rename(family.id, 'Silva Santos')).name).toBe('Silva Santos');
    await login(db, 'u2');
    await expect(repo.rename(family.id, 'Invasão')).rejects.toMatchObject({ code: 'family/not-found' });
  });
});
