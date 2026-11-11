import { DomainError } from '@/shared/lib';
import type { AuthGateway, AuthUser } from '@/entities/session';

export const OTP_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Normaliza (apara, minúsculas) e valida o e-mail. Lança `auth/invalid-email`. */
export function normalizeEmail(email: string): string {
  const value = email.trim().toLowerCase();
  if (value.length > 254 || !EMAIL_PATTERN.test(value)) {
    throw new DomainError('auth/invalid-email', 'Informe um e-mail válido, como nome@exemplo.com.');
  }
  return value;
}

/** Aceita o código com espaços ("123 456") e exige exatamente 6 dígitos. Lança `auth/invalid-code`. */
export function normalizeEmailCode(code: string): string {
  const value = code.replace(/\s+/g, '');
  if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(value)) {
    throw new DomainError('auth/invalid-code', `O código tem ${OTP_LENGTH} dígitos.`);
  }
  return value;
}

/** `true` quando o usuário cancelou o login social (não é erro a exibir). */
export const isAuthCancelled = (error: unknown): boolean => error instanceof DomainError && error.code === 'auth/cancelled';

type Deps = { auth: AuthGateway };

/** Envia o código por e-mail e devolve o e-mail normalizado (para a tela de verificação). */
export async function requestEmailCode({ auth }: Deps, email: string): Promise<string> {
  const normalized = normalizeEmail(email);
  await auth.sendEmailOtp(normalized);
  return normalized;
}

export async function verifyEmailCode({ auth }: Deps, input: { email: string; code: string }): Promise<AuthUser> {
  return auth.verifyEmailOtp(normalizeEmail(input.email), normalizeEmailCode(input.code));
}

export const signInWithApple = ({ auth }: Deps): Promise<AuthUser> => auth.signInWithApple();
export const signInWithGoogle = ({ auth }: Deps): Promise<AuthUser> => auth.signInWithGoogle();
export const signOut = ({ auth }: Deps): Promise<void> => auth.signOut();
