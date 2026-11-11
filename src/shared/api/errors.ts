import { DomainError } from '@/shared/lib';

/** Formato comum dos erros do supabase-js (PostgREST, Auth, Storage e Functions). */
export interface BackendErrorLike {
  message?: string;
  code?: string;
  status?: number;
  details?: string | null;
}

export const errorCode = (e: BackendErrorLike | null | undefined): string => e?.code ?? '';
export const errorMessage = (e: BackendErrorLike | null | undefined): string => e?.message ?? '';

/** Cria o erro de domínio (mensagem pt-BR, sem dados de saúde) preservando a causa técnica. */
export function backendError(code: string, message: string, cause?: unknown): DomainError {
  return new DomainError(code, message, { cause });
}

/** Lança `DomainError` se houver erro; devolve os dados caso contrário. */
export function unwrap<T>(
  result: { data: T | null; error: BackendErrorLike | null },
  code: string,
  message: string,
): T {
  if (result.error) throw backendError(code, message, result.error);
  if (result.data === null) throw backendError(code, message);
  return result.data;
}
