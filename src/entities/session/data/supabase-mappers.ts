import type { User } from '@supabase/supabase-js';
import type { AuthProvider, AuthUser } from '../domain/session';

const PROVIDERS: readonly AuthProvider[] = ['email', 'apple', 'google'];

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim().length > 0 ? v.trim() : null);

/** Usuário do Supabase Auth → `AuthUser` do domínio. */
export function mapAuthUser(user: Pick<User, 'id' | 'app_metadata' | 'user_metadata'> & { email?: string | null }): AuthUser {
  const provider = text(user.app_metadata?.provider);
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: text(user.email),
    displayName: text(meta.full_name) ?? text(meta.name),
    provider: PROVIDERS.find((p) => p === provider) ?? 'email',
  };
}
