import { DomainError, isDomainError } from '@/shared/lib';
import type { AuthGateway } from '@/entities/session';

/** Exclusão definitiva da conta e dos dados (LGPD art. 18, VI). A tela deve pedir confirmação antes. */
export async function deleteAccount({ auth }: { auth: AuthGateway }): Promise<void> {
  try {
    await auth.deleteAccount();
  } catch (cause) {
    if (isDomainError(cause)) throw cause;
    throw new DomainError(
      'account/delete-failed',
      'Não foi possível excluir a conta agora. Verifique a conexão e tente novamente; nada foi apagado.',
      { cause },
    );
  }
}
