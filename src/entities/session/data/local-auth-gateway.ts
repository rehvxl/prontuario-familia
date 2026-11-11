import {
  DomainError,
  LOCAL_COLLECTIONS,
  LOCAL_SESSION_ID,
  clearLocalFiles,
  getLocalUserId,
  newId,
  requireLocalUserId,
  type LocalDb,
  type LocalSessionDoc,
} from '@/shared/lib';
import type { AuthGateway, AuthProvider, AuthUser } from '../domain/session';

/** Código OTP fixo do modo demonstração. Nunca existe em builds com Supabase. */
export const DEMO_OTP_CODE = '123456';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Autenticação simulada para o modo demonstração: OTP fixo; Apple e Google "entram" sem rede. */
export function createLocalAuthGateway(db: LocalDb): AuthGateway {
  const listeners = new Set<(user: AuthUser | null) => void>();
  const notify = (user: AuthUser | null) => listeners.forEach((l) => l(user));

  const startSession = async (user: AuthUser): Promise<AuthUser> => {
    await db.put(LOCAL_COLLECTIONS.users, user.id, user);
    await db.put<LocalSessionDoc>(LOCAL_COLLECTIONS.session, LOCAL_SESSION_ID, { userId: user.id });
    notify(user);
    return user;
  };

  const social = (provider: Exclude<AuthProvider, 'email'>, displayName: string): Promise<AuthUser> =>
    startSession({ id: `demo-${provider}`, email: `${provider}@demo.prontuario.local`, displayName, provider });

  const currentUser = async (): Promise<AuthUser | null> => {
    const id = await getLocalUserId(db);
    return id ? db.get<AuthUser>(LOCAL_COLLECTIONS.users, id) : null;
  };

  return {
    async sendEmailOtp(email) {
      if (!normalizeEmail(email)) throw new DomainError('auth/invalid-email', 'Informe um e-mail válido.');
    },

    async verifyEmailOtp(email, code) {
      if (code.trim() !== DEMO_OTP_CODE) {
        throw new DomainError('auth/invalid-code', 'Código inválido ou expirado. No modo demonstração, use 123456.');
      }
      const normalized = normalizeEmail(email);
      const users = await db.list<AuthUser>(LOCAL_COLLECTIONS.users);
      const existing = users.find((u) => u.provider === 'email' && u.email === normalized);
      return startSession(existing ?? { id: newId(), email: normalized, displayName: null, provider: 'email' });
    },

    signInWithApple: () => social('apple', 'Usuário Apple (demonstração)'),
    signInWithGoogle: () => social('google', 'Usuário Google (demonstração)'),
    availableProviders: async () => ['apple', 'google'],
    getCurrentUser: currentUser,

    onAuthStateChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    async signOut() {
      await db.remove(LOCAL_COLLECTIONS.session, LOCAL_SESSION_ID);
      notify(null);
    },

    async deleteAccount() {
      await requireLocalUserId(db);
      await db.clear();
      clearLocalFiles();
      notify(null);
    },
  };
}
