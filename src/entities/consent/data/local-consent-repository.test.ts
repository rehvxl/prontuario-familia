import { LOCAL_COLLECTIONS, LOCAL_SESSION_ID } from '@/shared/lib';
import { createMemoryDb } from '@/shared/lib/testing';
import { hasValidConsent } from '../domain/consent';
import { createLocalConsentRepository } from './local-consent-repository';

const login = (db: ReturnType<typeof createMemoryDb>, userId: string) =>
  db.put(LOCAL_COLLECTIONS.session, LOCAL_SESSION_ID, { userId });

describe('createLocalConsentRepository', () => {
  it('sem sessão lista vazio, mas não permite aceitar', async () => {
    const repo = createLocalConsentRepository(createMemoryDb());
    expect(await repo.listMine()).toEqual([]);
    await expect(repo.accept('terms_and_privacy', 'v1')).rejects.toMatchObject({ code: 'auth/unauthenticated' });
  });

  it('registra aceite com data e sem revogação, por usuário', async () => {
    const db = createMemoryDb();
    const repo = createLocalConsentRepository(db);
    await login(db, 'u1');
    await repo.accept('terms_and_privacy', 'v1');
    await repo.accept('health_data_processing', 'v1');
    const mine = await repo.listMine();
    expect(mine).toHaveLength(2);
    expect(mine[0]).toMatchObject({ version: 'v1', revokedAt: null });
    expect(hasValidConsent(mine, 'v1')).toBe(true);

    await login(db, 'u2');
    expect(await repo.listMine()).toEqual([]);
  });

  it('revogar marca revokedAt e invalida o consentimento; aceitar de novo reativa', async () => {
    const db = createMemoryDb();
    const repo = createLocalConsentRepository(db);
    await login(db, 'u1');
    await repo.accept('terms_and_privacy', 'v1');
    await repo.accept('health_data_processing', 'v1');
    await repo.revoke('health_data_processing');
    expect(hasValidConsent(await repo.listMine(), 'v1')).toBe(false);
    await repo.accept('health_data_processing', 'v1');
    expect(hasValidConsent(await repo.listMine(), 'v1')).toBe(true);
  });

  it('revogar o que nunca foi aceito não faz nada', async () => {
    const db = createMemoryDb();
    const repo = createLocalConsentRepository(db);
    await login(db, 'u1');
    await expect(repo.revoke('terms_and_privacy')).resolves.toBeUndefined();
    expect(await repo.listMine()).toEqual([]);
  });
});
