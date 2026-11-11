import { createMockClient, fail, ok } from '@/shared/api/mock-client';
import { createSupabaseHealthRecordRepository } from './supabase-health-record-repository';

const att = (id: string, created: string) => ({
  id,
  record_id: 'r1',
  storage_path: `f1/r1/${id}.pdf`,
  file_name: 'laudo.pdf',
  mime_type: 'application/pdf',
  size_bytes: '2048',
  created_at: created,
});
const row = {
  id: 'r1',
  family_id: 'f1',
  member_id: 'm1',
  type: 'exam',
  title: 'Hemograma',
  record_date: '2026-10-20',
  location: 'Lab Central',
  professional: null,
  notes: null,
  created_at: '2026-10-20T12:00:00Z',
  updated_at: '2026-10-20T12:00:00Z',
  attachments: [att('a2', '2026-10-21T00:00:00Z'), att('a1', '2026-10-20T13:00:00Z')],
};

describe('createSupabaseHealthRecordRepository', () => {
  it('list mapeia registro + anexos (ordenados, size_bytes numérico) e usa colunas explícitas', async () => {
    const m = createMockClient();
    m.fromQueue('health_records', ok([row]));

    const [rec] = await createSupabaseHealthRecordRepository(m.client).list('f1');

    expect(rec).toMatchObject({ id: 'r1', familyId: 'f1', memberId: 'm1', date: '2026-10-20', title: 'Hemograma', location: 'Lab Central', professional: null });
    expect(rec?.attachments.map((a) => a.id)).toEqual(['a1', 'a2']);
    expect(rec?.attachments[0]).toMatchObject({ recordId: 'r1', storagePath: 'f1/r1/a1.pdf', sizeBytes: 2048, fileName: 'laudo.pdf' });
    const select = m.callsOf('from:health_records').find(([method]) => method === 'select');
    expect(String(select?.[1][0])).not.toContain('search');
    expect(String(select?.[1][0])).toContain('attachments(');
  });

  it('list filtra por família, membro e tipos e ordena por data/criação desc', async () => {
    const m = createMockClient();
    m.fromQueue('health_records', ok([]));

    await createSupabaseHealthRecordRepository(m.client).list('f1', { memberId: 'm1', types: ['exam', 'vaccine'] });

    expect(m.callsOf('from:health_records')).toEqual(
      expect.arrayContaining([
        ['eq', ['family_id', 'f1']],
        ['eq', ['member_id', 'm1']],
        ['in', ['type', ['exam', 'vaccine']]],
        ['order', ['record_date', { ascending: false }]],
        ['order', ['created_at', { ascending: false }]],
      ]),
    );
  });

  it('list com texto usa a RPC de busca (e não a tabela)', async () => {
    const m = createMockClient();
    m.rpcQueue('search_health_records', ok([row]));

    const list = await createSupabaseHealthRecordRepository(m.client).list('f1', { text: '  hemogr ', memberId: 'm1', types: ['exam'] });

    expect(list).toHaveLength(1);
    expect(m.raw.rpc).toHaveBeenCalledWith('search_health_records', {
      p_family_id: 'f1',
      p_text: 'hemogr',
      p_member_id: 'm1',
      p_types: ['exam'],
    });
    expect(m.raw.from).not.toHaveBeenCalled();
  });

  it('list ignora texto em branco e lista tipos vazia', async () => {
    const m = createMockClient();
    m.fromQueue('health_records', ok([]));

    await createSupabaseHealthRecordRepository(m.client).list('f1', { text: '   ', types: [] });

    expect(m.raw.rpc).not.toHaveBeenCalled();
    expect(m.callsOf('from:health_records').some(([method]) => method === 'in')).toBe(false);
  });

  it('getById devolve null se não achar', async () => {
    const m = createMockClient();
    m.fromQueue('health_records', ok(null));
    expect(await createSupabaseHealthRecordRepository(m.client).getById('x')).toBeNull();
  });

  it('create manda snake_case (record_date), troca texto em branco por null e não manda id', async () => {
    const m = createMockClient();
    m.fromQueue('health_records', ok({ ...row, attachments: [] }));

    const rec = await createSupabaseHealthRecordRepository(m.client).create({
      familyId: 'f1',
      memberId: 'm1',
      type: 'exam',
      title: ' Hemograma ',
      date: '2026-10-20',
      location: 'Lab Central',
      professional: '  ',
      notes: null,
    });

    expect(rec.attachments).toEqual([]);
    expect(m.callsOf('from:health_records')).toContainEqual([
      'insert',
      [{ family_id: 'f1', member_id: 'm1', type: 'exam', title: 'Hemograma', record_date: '2026-10-20', location: 'Lab Central', professional: null, notes: null }],
    ]);
  });

  it('remove apaga os arquivos do Storage antes do registro', async () => {
    const m = createMockClient();
    m.fromQueue('attachments', ok([{ storage_path: 'f1/r1/a1.pdf' }]));
    m.fromQueue('health_records', ok(null));

    await createSupabaseHealthRecordRepository(m.client).remove('r1');

    expect(m.storage.remove).toHaveBeenCalledWith(['f1/r1/a1.pdf']);
    expect(m.callsOf('from:attachments')).toContainEqual(['eq', ['record_id', 'r1']]);
    expect(m.callsOf('from:health_records')).toContainEqual(['eq', ['id', 'r1']]);
  });

  it('remove mantém o registro se o Storage falhar', async () => {
    const m = createMockClient();
    m.fromQueue('attachments', ok([{ storage_path: 'f1/r1/a1.pdf' }]));
    m.storage.remove.mockResolvedValueOnce(fail({ message: 'boom' }));

    await expect(createSupabaseHealthRecordRepository(m.client).remove('r1')).rejects.toMatchObject({ code: 'storage/remove-failed' });
    expect(m.raw.from).not.toHaveBeenCalledWith('health_records');
  });

  it('addAttachment grava o metadado com a família tirada do caminho', async () => {
    const m = createMockClient();
    m.fromQueue('attachments', ok(att('a1', '2026-10-20T13:00:00Z')));

    const created = await createSupabaseHealthRecordRepository(m.client).addAttachment('r1', {
      id: 'a1',
      storagePath: 'f1/r1/a1.pdf',
      fileName: 'laudo.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
    });

    expect(created).toMatchObject({ id: 'a1', recordId: 'r1', sizeBytes: 2048 });
    expect(m.callsOf('from:attachments')).toContainEqual([
      'insert',
      [{ id: 'a1', family_id: 'f1', record_id: 'r1', storage_path: 'f1/r1/a1.pdf', file_name: 'laudo.pdf', mime_type: 'application/pdf', size_bytes: 2048 }],
    ]);
  });

  it('addAttachment: registro inexistente (FK) e erro genérico têm códigos próprios', async () => {
    const m = createMockClient();
    m.fromQueue('attachments', fail({ message: 'fk', code: '23503' }), fail({ message: 'x', code: '42501' }));
    const repo = createSupabaseHealthRecordRepository(m.client);
    const input = { id: 'a1', storagePath: 'f1/r1/a1.pdf', fileName: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 1 };

    await expect(repo.addAttachment('r1', input)).rejects.toMatchObject({ code: 'attachment/record-not-found' });
    await expect(repo.addAttachment('r1', input)).rejects.toMatchObject({ code: 'attachment/create-failed' });
  });
});
