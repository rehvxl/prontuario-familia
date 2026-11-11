import { File, Paths } from 'expo-file-system';
import { LOCAL_COLLECTIONS, clearLocalFiles } from '@/shared/lib';
import { createMemoryDb } from '@/shared/lib/testing';
import type { AuthUser } from '../domain/session';
import { DEMO_OTP_CODE, createLocalAuthGateway } from './local-auth-gateway';

describe('createLocalAuthGateway', () => {
  beforeEach(() => clearLocalFiles());

  it('o código de demonstração é 123456', () => {
    expect(DEMO_OTP_CODE).toBe('123456');
  });

  it('entra por e-mail com o código certo e persiste a sessão', async () => {
    const db = createMemoryDb();
    const auth = createLocalAuthGateway(db);
    expect(await auth.getCurrentUser()).toBeNull();
    await auth.sendEmailOtp('ana@exemplo.com');
    const user = await auth.verifyEmailOtp(' Ana@Exemplo.com ', '123456');
    expect(user).toMatchObject({ email: 'ana@exemplo.com', provider: 'email' });
    expect(await createLocalAuthGateway(db).getCurrentUser()).toEqual(user);
  });

  it('rejeita código errado sem criar sessão', async () => {
    const auth = createLocalAuthGateway(createMemoryDb());
    await expect(auth.verifyEmailOtp('ana@exemplo.com', '000000')).rejects.toMatchObject({ code: 'auth/invalid-code' });
    expect(await auth.getCurrentUser()).toBeNull();
  });

  it('o mesmo e-mail volta sempre para a mesma conta; e-mails diferentes têm contas diferentes', async () => {
    const auth = createLocalAuthGateway(createMemoryDb());
    const first = await auth.verifyEmailOtp('ana@exemplo.com', '123456');
    await auth.signOut();
    const again = await auth.verifyEmailOtp('ana@exemplo.com', '123456');
    const other = await auth.verifyEmailOtp('bia@exemplo.com', '123456');
    expect(again.id).toBe(first.id);
    expect(other.id).not.toBe(first.id);
  });

  it('Apple e Google simulados entram sem rede e têm id estável', async () => {
    const auth = createLocalAuthGateway(createMemoryDb());
    expect(await auth.availableProviders()).toEqual(['apple', 'google']);
    const apple = await auth.signInWithApple();
    expect(apple).toMatchObject({ provider: 'apple', id: 'demo-apple' });
    expect((await auth.signInWithGoogle()).provider).toBe('google');
    expect((await auth.getCurrentUser())?.id).toBe('demo-google');
  });

  it('notifica ouvintes no login e logout e para de notificar após cancelar a inscrição', async () => {
    const auth = createLocalAuthGateway(createMemoryDb());
    const events: (AuthUser | null)[] = [];
    const off = auth.onAuthStateChange((u) => events.push(u));
    await auth.signInWithApple();
    await auth.signOut();
    off();
    await auth.signInWithGoogle();
    expect(events.map((e) => e?.provider ?? null)).toEqual(['apple', null]);
  });

  it('deleteAccount apaga todos os dados e arquivos e encerra a sessão', async () => {
    const db = createMemoryDb();
    const auth = createLocalAuthGateway(db);
    const events: (AuthUser | null)[] = [];
    auth.onAuthStateChange((u) => events.push(u));
    await auth.signInWithApple();
    await db.put(LOCAL_COLLECTIONS.records, 'r1', { id: 'r1' });
    const file = new File(Paths.document, 'health-files', 'f', 'r', 'a.pdf');
    file.parentDirectory.create({ intermediates: true, idempotent: true });
    file.create({ overwrite: true });

    await auth.deleteAccount();

    expect(await db.dump()).toEqual({});
    expect(file.exists).toBe(false);
    expect(await auth.getCurrentUser()).toBeNull();
    expect(events.at(-1)).toBeNull();
  });

  it('deleteAccount sem sessão falha e não apaga nada', async () => {
    const db = createMemoryDb();
    await db.put(LOCAL_COLLECTIONS.records, 'r1', { id: 'r1' });
    await expect(createLocalAuthGateway(db).deleteAccount()).rejects.toMatchObject({ code: 'auth/unauthenticated' });
    expect(await db.list(LOCAL_COLLECTIONS.records)).toHaveLength(1);
  });
});
