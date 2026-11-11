import { act, renderHook, waitFor } from '@testing-library/react-native';
import { DEPENDENCY_KEYS, DomainError } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { createLocalAuthGateway, sessionKeys, useCurrentUser } from '@/entities/session';
import { useRequestEmailCode, useSignInWithApple, useSignOut, useVerifyEmailCode } from './hooks';

function setup() {
  const auth = createLocalAuthGateway(createMemoryDb());
  const { wrapper, queryClient } = renderWithDependencies({ [DEPENDENCY_KEYS.auth]: auth });
  return { auth, wrapper, queryClient };
}

describe('hooks de autenticação', () => {
  it('useRequestEmailCode devolve o e-mail normalizado e recusa e-mail inválido', async () => {
    const { wrapper } = setup();
    const { result } = await renderHook(() => useRequestEmailCode(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync('invalido')).rejects.toBeInstanceOf(DomainError);
    });
    await act(async () => {
      expect(await result.current.mutateAsync(' Ana@Exemplo.com ')).toBe('ana@exemplo.com');
    });
  });

  it('useVerifyEmailCode com código certo coloca o usuário no cache da sessão', async () => {
    const { wrapper, queryClient } = setup();
    const { result } = await renderHook(() => ({ verify: useVerifyEmailCode(), user: useCurrentUser() }), { wrapper });
    await waitFor(() => expect(result.current.user.isSuccess).toBe(true));
    expect(result.current.user.data).toBeNull();

    await act(async () => {
      await result.current.verify.mutateAsync({ email: 'a@b.com', code: '123456' });
    });
    await waitFor(() => expect(result.current.user.data?.email).toBe('a@b.com'));
    expect(queryClient.getQueryData(sessionKeys.user)).toMatchObject({ email: 'a@b.com' });
  });

  it('código errado devolve erro de domínio e não cria sessão', async () => {
    const { wrapper, queryClient } = setup();
    const { result } = await renderHook(() => useVerifyEmailCode(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ email: 'a@b.com', code: '654321' })).rejects.toMatchObject({ code: 'auth/invalid-code' });
    });
    expect(queryClient.getQueryData(sessionKeys.user)).toBeUndefined();
  });

  it('entrar com outra conta descarta o cache de dados da conta anterior', async () => {
    const { wrapper, queryClient } = setup();
    queryClient.setQueryData(['families', 'mine'], { id: 'f-antiga' });
    queryClient.setQueryData(['records', 'timeline', 'f-antiga', 'm'], []);
    const { result } = await renderHook(() => useSignInWithApple(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(queryClient.getQueryData(['families', 'mine'])).toBeUndefined();
    expect(queryClient.getQueryData(['records', 'timeline', 'f-antiga', 'm'])).toBeUndefined();
    expect(queryClient.getQueryData(sessionKeys.user)).toMatchObject({ provider: 'apple' });
  });

  it('useSignOut limpa o cache inteiro e deixa a sessão como "sem usuário"', async () => {
    const { wrapper, queryClient, auth } = setup();
    const { result } = await renderHook(() => ({ verify: useVerifyEmailCode(), out: useSignOut() }), { wrapper });
    await act(async () => {
      await result.current.verify.mutateAsync({ email: 'a@b.com', code: '123456' });
    });
    queryClient.setQueryData(['families', 'mine'], { id: 'f1' });

    await act(async () => {
      await result.current.out.mutateAsync();
    });

    expect(queryClient.getQueryData(['families', 'mine'])).toBeUndefined();
    expect(queryClient.getQueryData(sessionKeys.user)).toBeNull();
    expect(await auth.getCurrentUser()).toBeNull();
  });
});
