import { createMockClient, fail, ok } from '@/shared/api/mock-client';
import type { NewMeasurement } from '../domain/types';
import { createSupabaseMeasurementRepository } from './supabase-measurement-repository';

const row = {
  id: 'x1',
  family_id: 'f1',
  member_id: 'm1',
  kind: 'vital',
  code: 'bp',
  label: 'Pressão arterial',
  value: '128',
  value2: 82,
  unit: 'mmHg',
  reference_low: null,
  reference_high: null,
  reference_text: null,
  taken_on: '2026-11-10',
  taken_at: '08:30:00',
  context: null,
  note: 'após caminhada',
  source_record_id: null,
  origin: 'manual',
  created_at: '2026-11-10T11:30:00Z',
  updated_at: '2026-11-10T11:30:00Z',
};
const input: NewMeasurement = {
  familyId: 'f1',
  memberId: 'm1',
  kind: 'lab',
  code: 'hba1c',
  label: 'Hemoglobina glicada (HbA1c)',
  value: 6.1,
  value2: null,
  unit: '%',
  referenceLow: 4,
  referenceHigh: 5.6,
  referenceText: null,
  takenOn: '2026-10-12',
  takenAt: null,
  context: null,
  note: null,
  sourceRecordId: 'r1',
  origin: 'ocr',
};

describe('createSupabaseMeasurementRepository', () => {
  it('listByMember mapeia snake → camel (numeric como número, hora HH:mm) e ordena por data', async () => {
    const m = createMockClient();
    m.fromQueue('measurements', ok([row]));
    const [measurement] = await createSupabaseMeasurementRepository(m.client).listByMember('m1');
    expect(measurement).toEqual({
      id: 'x1',
      familyId: 'f1',
      memberId: 'm1',
      kind: 'vital',
      code: 'bp',
      label: 'Pressão arterial',
      value: 128,
      value2: 82,
      unit: 'mmHg',
      referenceLow: null,
      referenceHigh: null,
      referenceText: null,
      takenOn: '2026-11-10',
      takenAt: '08:30',
      context: null,
      note: 'após caminhada',
      sourceRecordId: null,
      origin: 'manual',
      createdAt: '2026-11-10T11:30:00Z',
      updatedAt: '2026-11-10T11:30:00Z',
    });
    expect(m.callsOf('from:measurements')).toEqual(
      expect.arrayContaining([
        ['eq', ['member_id', 'm1']],
        ['order', ['taken_on', { ascending: true }]],
      ]),
    );
  });

  it('listByFamily e listBySourceRecord filtram pela coluna certa', async () => {
    const m = createMockClient();
    m.fromQueue('measurements', ok([]), ok([]));
    const repo = createSupabaseMeasurementRepository(m.client);
    await repo.listByFamily('f1');
    await repo.listBySourceRecord('r1');
    expect(m.callsOf('from:measurements')).toEqual(expect.arrayContaining([['eq', ['family_id', 'f1']], ['eq', ['source_record_id', 'r1']]]));
  });

  it('createMany faz um insert em lote com as colunas exatas e não chama o banco com lista vazia', async () => {
    const m = createMockClient();
    m.fromQueue('measurements', ok([{ ...row, kind: 'lab', code: 'hba1c', value: 6.1, value2: null, taken_at: null }]));
    const repo = createSupabaseMeasurementRepository(m.client);
    expect(await repo.createMany([])).toEqual([]);
    expect(m.raw.from).not.toHaveBeenCalled();
    const created = await repo.createMany([input]);
    expect(created[0]).toMatchObject({ code: 'hba1c', value: 6.1, value2: null, takenAt: null });
    expect(m.callsOf('from:measurements')).toContainEqual([
      'insert',
      [
        [
          {
            family_id: 'f1',
            member_id: 'm1',
            kind: 'lab',
            code: 'hba1c',
            label: 'Hemoglobina glicada (HbA1c)',
            value: 6.1,
            value2: null,
            unit: '%',
            reference_low: 4,
            reference_high: 5.6,
            reference_text: null,
            taken_on: '2026-10-12',
            taken_at: null,
            context: null,
            note: null,
            source_record_id: 'r1',
            origin: 'ocr',
          },
        ],
      ],
    ]);
  });

  it('createMany traduz único (23505) e check (23514) para os códigos do adaptador local', async () => {
    const m = createMockClient();
    m.fromQueue('measurements', fail({ code: '23505' }), fail({ code: '23514' }), fail({ message: 'boom' }));
    const repo = createSupabaseMeasurementRepository(m.client);
    await expect(repo.createMany([input])).rejects.toMatchObject({ code: 'measurement/duplicate' });
    await expect(repo.createMany([input])).rejects.toMatchObject({ code: 'measurement/invalid' });
    await expect(repo.createMany([input])).rejects.toMatchObject({ code: 'measurement/create-failed' });
  });

  it('update manda só as colunas presentes, em snake_case', async () => {
    const m = createMockClient();
    m.fromQueue('measurements', ok(row));
    await createSupabaseMeasurementRepository(m.client).update('x1', { referenceLow: 70, takenAt: null, value: 99 });
    expect(m.callsOf('from:measurements')).toEqual(
      expect.arrayContaining([
        ['update', [{ reference_low: 70, taken_at: null, value: 99 }]],
        ['eq', ['id', 'x1']],
      ]),
    );
  });

  it('update sem mudança só lê; inexistente vira not-found', async () => {
    const m = createMockClient();
    m.fromQueue('measurements', ok(row), fail({ code: 'PGRST116' }));
    const repo = createSupabaseMeasurementRepository(m.client);
    expect((await repo.update('x1', {})).id).toBe('x1');
    expect(m.callsOf('from:measurements').some(([method]) => method === 'update')).toBe(false);
    await expect(repo.update('nada', { value: 1 })).rejects.toMatchObject({ code: 'measurement/not-found' });
  });

  it('remove apaga pelo id e traduz falha', async () => {
    const m = createMockClient();
    m.fromQueue('measurements', ok(null), fail({ message: 'boom' }));
    const repo = createSupabaseMeasurementRepository(m.client);
    await repo.remove('x1');
    expect(m.callsOf('from:measurements')).toEqual(expect.arrayContaining([['delete', []], ['eq', ['id', 'x1']]]));
    await expect(repo.remove('x1')).rejects.toMatchObject({ code: 'measurement/remove-failed' });
  });

  it('falha na listagem vira list-failed', async () => {
    const m = createMockClient();
    m.fromQueue('measurements', fail({ message: 'boom' }));
    await expect(createSupabaseMeasurementRepository(m.client).listByMember('m1')).rejects.toMatchObject({ code: 'measurement/list-failed' });
  });
});
