import { DomainError } from '@/shared/lib';
import type { AuthGateway, AuthUser } from '@/entities/session';
import {
  isAuthCancelled,
  normalizeEmail,
  normalizeEmailCode,
  requestEmailCode,
  signInWithApple,
  signInWithGoogle,
  signOut,
  verifyEmailCode,
} from './auth';

const user: AuthUser = { id: 'u', email: 'a@b.com', displayName: null, provider: 'email' };

function fakeAuth(over: Partial<AuthGateway> = {}): AuthGateway & { calls: string[] } {
  const calls: string[] = [];
  const track = <T,>(name: string, value: T) => async (...args: unknown[]) => {
    calls.push(`${name}(${args.join(',')})`);
    return value;
  };
  return {
    calls,
    sendEmailOtp: track('send', undefined),
    verifyEmailOtp: track('verify', user),
    signInWithApple: track('apple', { ...user, provider: 'apple' as const }),
    signInWithGoogle: track('google', { ...user, provider: 'google' as const }),
    availableProviders: async () => ['apple', 'google'],
    getCurrentUser: async () => null,
    onAuthStateChange: () => () => undefined,
    signOut: track('signOut', undefined),
    deleteAccount: track('delete', undefined),
    ...over,
  };
}

describe('normalizeEmail', () => {
  it('apara e põe em minúsculas', () => {
    expect(normalizeEmail('  Ana.Silva@Exemplo.COM ')).toBe('ana.silva@exemplo.com');
  });
  it.each(['', 'ana', 'ana@', '@exemplo.com', 'ana@exemplo', 'ana @exemplo.com', 'a@b@c.com', `${'a'.repeat(250)}@x.com`])(
    'recusa "%s"',
    (bad) => {
      expect(() => normalizeEmail(bad)).toThrow(DomainError);
      expect(() => normalizeEmail(bad)).toThrow(/e-mail válido/);
    },
  );
});

describe('normalizeEmailCode', () => {
  it('aceita 6 dígitos, mesmo com espaços', () => {
    expect(normalizeEmailCode('123456')).toBe('123456');
    expect(normalizeEmailCode(' 123 456 ')).toBe('123456');
  });
  it.each(['', '12345', '1234567', '12345a', 'abcdef'])('recusa "%s"', (bad) => {
    expect(() => normalizeEmailCode(bad)).toThrow(/6 dígitos/);
  });
});

describe('casos de uso', () => {
  it('requestEmailCode valida antes de chamar o gateway e devolve o e-mail normalizado', async () => {
    const auth = fakeAuth();
    await expect(requestEmailCode({ auth }, 'invalido')).rejects.toMatchObject({ code: 'auth/invalid-email' });
    expect(auth.calls).toEqual([]);
    expect(await requestEmailCode({ auth }, ' Ana@Exemplo.com ')).toBe('ana@exemplo.com');
    expect(auth.calls).toEqual(['send(ana@exemplo.com)']);
  });

  it('verifyEmailCode normaliza e-mail e código; código inválido não chega ao gateway', async () => {
    const auth = fakeAuth();
    await expect(verifyEmailCode({ auth }, { email: 'a@b.com', code: '12' })).rejects.toMatchObject({ code: 'auth/invalid-code' });
    expect(auth.calls).toEqual([]);
    expect(await verifyEmailCode({ auth }, { email: ' A@B.com', code: '123 456' })).toEqual(user);
    expect(auth.calls).toEqual(['verify(a@b.com,123456)']);
  });

  it('propaga o erro do gateway (ex.: código errado) sem engolir', async () => {
    const auth = fakeAuth({
      verifyEmailOtp: async () => {
        throw new DomainError('auth/invalid-code', 'Código inválido ou expirado.');
      },
    });
    await expect(verifyEmailCode({ auth }, { email: 'a@b.com', code: '000000' })).rejects.toThrow('Código inválido ou expirado.');
  });

  it('login social e logout delegam ao gateway', async () => {
    const auth = fakeAuth();
    expect((await signInWithApple({ auth })).provider).toBe('apple');
    expect((await signInWithGoogle({ auth })).provider).toBe('google');
    await signOut({ auth });
    expect(auth.calls).toEqual(['apple()', 'google()', 'signOut()']);
  });

  it('isAuthCancelled reconhece só o cancelamento do usuário', () => {
    expect(isAuthCancelled(new DomainError('auth/cancelled', 'x'))).toBe(true);
    expect(isAuthCancelled(new DomainError('auth/other', 'x'))).toBe(false);
    expect(isAuthCancelled(new Error('auth/cancelled'))).toBe(false);
  });
});
