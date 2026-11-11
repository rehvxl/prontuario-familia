import { createMockClient, fail, ok } from '@/shared/api/mock-client';
import { createSupabaseMemberRepository } from './supabase-member-repository';

const row = {
  id: 'm1',
  family_id: 'f1',
  full_name: 'Maria Silva',
  birth_date: '1990-05-10',
  relationship: 'self',
  sex: 'female',
  created_at: '2026-11-01T10:00:00Z',
};
const member = {
  id: 'm1',
  familyId: 'f1',
  fullName: 'Maria Silva',
  birthDate: '1990-05-10',
  relationship: 'self',
  sex: 'female',
  createdAt: '2026-11-01T10:00:00Z',
};

describe('createSupabaseMemberRepository', () => {
  it('listByFamily filtra pela família, ordena por criação e mapeia', async () => {
    const m = createMockClient();
    m.fromQueue('members', ok([row]));

    expect(await createSupabaseMemberRepository(m.client).listByFamily('f1')).toEqual([member]);
    expect(m.callsOf('from:members')).toEqual(
      expect.arrayContaining([
        ['eq', ['family_id', 'f1']],
        ['order', ['created_at', { ascending: true }]],
      ]),
    );
  });

  it('getById devolve null quando não existe (ou a RLS esconde)', async () => {
    const m = createMockClient();
    m.fromQueue('members', ok(null), ok(row));
    const repo = createSupabaseMemberRepository(m.client);

    expect(await repo.getById('x')).toBeNull();
    expect(await repo.getById('m1')).toEqual(member);
  });

  it('create envia snake_case sem id/created_at e aceita data de nascimento nula', async () => {
    const m = createMockClient();
    m.fromQueue('members', ok({ ...row, birth_date: null }));

    const created = await createSupabaseMemberRepository(m.client).create({
      familyId: 'f1',
      fullName: ' Maria Silva ',
      birthDate: null,
      relationship: 'self',
      sex: 'female',
    });

    expect(created.birthDate).toBeNull();
    expect(m.callsOf('from:members')).toContainEqual([
      'insert',
      [{ family_id: 'f1', full_name: 'Maria Silva', birth_date: null, relationship: 'self', sex: 'female' }],
    ]);
  });

  it('update envia apenas os campos informados (e permite limpar a data)', async () => {
    const m = createMockClient();
    m.fromQueue('members', ok({ ...row, birth_date: null, sex: 'other' }));

    const updated = await createSupabaseMemberRepository(m.client).update('m1', { birthDate: null, sex: 'other' });

    expect(updated.sex).toBe('other');
    expect(m.callsOf('from:members')).toContainEqual(['update', [{ birth_date: null, sex: 'other' }]]);
  });

  it('update sem mudanças só lê o membro', async () => {
    const m = createMockClient();
    m.fromQueue('members', ok(row));

    expect(await createSupabaseMemberRepository(m.client).update('m1', {})).toEqual(member);
    expect(m.callsOf('from:members').some(([method]) => method === 'update')).toBe(false);
  });

  it('create traduz falha em DomainError pt-BR', async () => {
    const m = createMockClient();
    m.fromQueue('members', fail({ message: 'new row violates row-level security policy', code: '42501' }));

    await expect(
      createSupabaseMemberRepository(m.client).create({ familyId: 'f2', fullName: 'X', birthDate: null, relationship: 'other', sex: 'unspecified' }),
    ).rejects.toMatchObject({ code: 'member/create-failed', message: expect.stringContaining('Não foi possível') });
  });

  it('remove apaga os arquivos do Storage ANTES de apagar o membro', async () => {
    const m = createMockClient();
    m.fromQueue(
      'attachments',
      ok([
        { storage_path: 'f1/r1/a1.pdf', health_records: { member_id: 'm1' } },
        { storage_path: 'f1/r2/a2.jpg', health_records: { member_id: 'm1' } },
      ]),
    );
    m.fromQueue('members', ok(null));
    const order: string[] = [];
    m.storage.remove.mockImplementation(async () => {
      order.push('storage');
      return ok([]);
    });
    m.raw.from.mockImplementation(((orig) => (t: string) => {
      order.push(`from:${t}`);
      return orig(t);
    })(m.raw.from.getMockImplementation()!));

    await createSupabaseMemberRepository(m.client).remove('m1');

    expect(m.bucket).toHaveBeenCalledWith('health-files');
    expect(m.storage.remove).toHaveBeenCalledWith(['f1/r1/a1.pdf', 'f1/r2/a2.jpg']);
    expect(order).toEqual(['from:attachments', 'storage', 'from:members']);
    expect(m.callsOf('from:attachments')).toContainEqual(['eq', ['health_records.member_id', 'm1']]);
    expect(m.callsOf('from:members')).toContainEqual(['eq', ['id', 'm1']]);
  });

  it('remove NÃO apaga o membro se a limpeza do Storage falhar', async () => {
    const m = createMockClient();
    m.fromQueue('attachments', ok([{ storage_path: 'f1/r1/a1.pdf' }]));
    m.storage.remove.mockResolvedValueOnce(fail({ message: 'boom' }));

    await expect(createSupabaseMemberRepository(m.client).remove('m1')).rejects.toMatchObject({ code: 'storage/remove-failed' });
    expect(m.raw.from).not.toHaveBeenCalledWith('members');
  });

  it('remove sem anexos não chama o Storage', async () => {
    const m = createMockClient();
    m.fromQueue('attachments', ok([]));
    m.fromQueue('members', ok(null));

    await createSupabaseMemberRepository(m.client).remove('m1');

    expect(m.storage.remove).not.toHaveBeenCalled();
  });
});
