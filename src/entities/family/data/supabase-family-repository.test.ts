import { createMockClient, fail, ok } from '@/shared/api/mock-client';
import { createSupabaseFamilyRepository } from './supabase-family-repository';

const row = { id: 'f1', name: 'Família Silva', created_at: '2026-11-01T10:00:00Z' };

describe('createSupabaseFamilyRepository', () => {
  it('getMyFamily mapeia snake_case → camelCase e traz o papel', async () => {
    const m = createMockClient();
    m.fromQueue('family_memberships', ok({ role: 'owner', families: row }));

    const family = await createSupabaseFamilyRepository(m.client).getMyFamily();

    expect(family).toEqual({ id: 'f1', name: 'Família Silva', createdAt: '2026-11-01T10:00:00Z', myRole: 'owner' });
    expect(m.callsOf('from:family_memberships')).toContainEqual(['order', ['role', { ascending: false }]]);
  });

  it('getMyFamily aceita families como array e devolve null sem associação', async () => {
    const m = createMockClient();
    m.fromQueue('family_memberships', ok({ role: 'editor', families: [row] }), ok(null));
    const repo = createSupabaseFamilyRepository(m.client);

    expect((await repo.getMyFamily())?.myRole).toBe('editor');
    expect(await repo.getMyFamily()).toBeNull();
  });

  it('getMyFamily traduz erro técnico em DomainError sem vazar detalhes', async () => {
    const m = createMockClient();
    m.fromQueue('family_memberships', fail({ message: 'connection refused', code: 'XX000' }));

    await expect(createSupabaseFamilyRepository(m.client).getMyFamily()).rejects.toMatchObject({
      name: 'DomainError',
      code: 'family/load-failed',
    });
  });

  it('createFamily chama a RPC com o nome aparado e devolve owner', async () => {
    const m = createMockClient();
    m.rpcQueue('create_family', ok(row));

    const family = await createSupabaseFamilyRepository(m.client).createFamily('  Família Silva ');

    expect(m.raw.rpc).toHaveBeenCalledWith('create_family', { p_name: 'Família Silva' });
    expect(family.myRole).toBe('owner');
    expect(family.createdAt).toBe(row.created_at);
  });

  it('createFamily distingue família já existente e nome inválido', async () => {
    const m = createMockClient();
    m.rpcQueue(
      'create_family',
      fail({ message: 'family_already_exists', code: 'P0001' }),
      fail({ message: 'O nome da família deve ter entre 2 e 60 caracteres', code: '22023' }),
    );
    const repo = createSupabaseFamilyRepository(m.client);

    await expect(repo.createFamily('Silva')).rejects.toMatchObject({ code: 'family/already-exists' });
    await expect(repo.createFamily('x')).rejects.toMatchObject({ code: 'family/invalid-name' });
  });

  it('rename atualiza só o nome e mapeia a linha', async () => {
    const m = createMockClient();
    m.fromQueue('families', ok({ ...row, name: 'Novos Silva' }));

    const family = await createSupabaseFamilyRepository(m.client).rename('f1', ' Novos Silva ');

    expect(family.name).toBe('Novos Silva');
    expect(m.callsOf('from:families')).toContainEqual(['update', [{ name: 'Novos Silva' }]]);
    expect(m.callsOf('from:families')).toContainEqual(['eq', ['id', 'f1']]);
  });

  it('rename por editor (RLS não afeta linhas) vira family/rename-forbidden', async () => {
    const m = createMockClient();
    m.fromQueue('families', fail({ message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' }));

    await expect(createSupabaseFamilyRepository(m.client).rename('f1', 'Outro')).rejects.toMatchObject({
      code: 'family/rename-forbidden',
    });
  });
});
