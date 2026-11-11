import { DomainError } from '@/shared/lib';
import type { AuthGateway } from '@/entities/session';
import { deleteAccount } from './delete-account';

const authThatFailsWith = (error: unknown) => ({ deleteAccount: async () => { throw error; } }) as unknown as AuthGateway;

describe('deleteAccount', () => {
  it('delega ao gateway', async () => {
    const spy = jest.fn(async () => undefined);
    await deleteAccount({ auth: { deleteAccount: spy } as unknown as AuthGateway });
    expect(spy).toHaveBeenCalledTimes(1);
  });
  it('troca erro técnico por mensagem em pt-BR dizendo que nada foi apagado, preservando a causa', async () => {
    const cause = new Error('fetch failed');
    const error = await deleteAccount({ auth: authThatFailsWith(cause) }).catch((e) => e);
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ code: 'account/delete-failed' });
    expect(error.message).toMatch(/nada foi apagado/);
    expect(error.cause).toBe(cause);
  });
  it('mantém erros de domínio como estão', async () => {
    const domain = new DomainError('auth/unauthenticated', 'Você precisa entrar para continuar.');
    await expect(deleteAccount({ auth: authThatFailsWith(domain) })).rejects.toBe(domain);
  });
});
