import { act, renderHook, waitFor } from '@testing-library/react-native';
import { DEPENDENCY_KEYS, LOCAL_COLLECTIONS, LOCAL_SESSION_ID, type LocalSessionDoc } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { createLocalHealthRecordRepository, recordKeys } from '@/entities/health-record';
import { createLocalMemberRepository, memberKeys, useMembers } from '@/entities/member';
import { useAddMember, useRemoveMember, useUpdateMember } from './hooks';

async function setup() {
  const db = createMemoryDb();
  await db.put<LocalSessionDoc>(LOCAL_COLLECTIONS.session, LOCAL_SESSION_ID, { userId: 'u1' });
  const { wrapper, queryClient } = renderWithDependencies({
    [DEPENDENCY_KEYS.members]: createLocalMemberRepository(db),
    [DEPENDENCY_KEYS.records]: createLocalHealthRecordRepository(db),
  });
  return { wrapper, queryClient, records: createLocalHealthRecordRepository(db) };
}

const person = { familyId: 'f1', fullName: 'Ana Souza', birthDate: '1990-05-10', relationship: 'self' as const, sex: 'female' as const };

describe('hooks de pessoas', () => {
  it('adicionar, editar e remover refletem na lista de pessoas', async () => {
    const { wrapper } = await setup();
    const { result } = await renderHook(
      () => ({ list: useMembers('f1'), add: useAddMember(), update: useUpdateMember(), remove: useRemoveMember() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    expect(result.current.list.data).toEqual([]);

    let id = '';
    await act(async () => {
      id = (await result.current.add.mutateAsync(person)).id;
    });
    await waitFor(() => expect(result.current.list.data?.map((m) => m.fullName)).toEqual(['Ana Souza']));

    await act(async () => {
      await result.current.update.mutateAsync({ id, changes: { fullName: 'Ana Maria Souza' } });
    });
    await waitFor(() => expect(result.current.list.data?.[0]?.fullName).toBe('Ana Maria Souza'));

    await act(async () => {
      await result.current.remove.mutateAsync(id);
    });
    await waitFor(() => expect(result.current.list.data).toEqual([]));
  });

  it('remover pessoa também invalida tudo de registros (linha do tempo e busca) e descarta o detalhe', async () => {
    const { wrapper, queryClient } = await setup();
    const { result } = await renderHook(() => ({ add: useAddMember(), remove: useRemoveMember() }), { wrapper });
    let id = '';
    await act(async () => {
      id = (await result.current.add.mutateAsync(person)).id;
    });
    queryClient.setQueryData(recordKeys.timeline('f1', id), []);
    queryClient.setQueryData(recordKeys.search('f1', { text: 'x' }), []);
    queryClient.setQueryData(memberKeys.detail(id), { id });

    await act(async () => {
      await result.current.remove.mutateAsync(id);
    });

    expect(queryClient.getQueryState(recordKeys.timeline('f1', id))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(recordKeys.search('f1', { text: 'x' }))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryData(memberKeys.detail(id))).toBeUndefined();
  });

  it('dados inválidos chegam à tela como erro de domínio', async () => {
    const { wrapper } = await setup();
    const { result } = await renderHook(() => useAddMember(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ ...person, fullName: 'A' })).rejects.toMatchObject({ code: 'member/invalid-name' });
    });
  });
});
