import { createMockClient, fail, ok } from '@/shared/api/mock-client';
import type { NewMedication } from '../domain/types';
import { createSupabaseMedicationRepository } from './supabase-medication-repository';

const row = {
  id: 'md1',
  family_id: 'f1',
  member_id: 'm1',
  name: 'Amoxicilina',
  dosage: '500 mg',
  instructions: '1 cápsula de 8 em 8 horas',
  start_on: '2026-11-05',
  end_on: '2026-11-11',
  source_record_id: 'r1',
  origin: 'ocr',
  created_at: '2026-11-05T12:00:00Z',
  updated_at: '2026-11-05T12:00:00Z',
};
const input: NewMedication = {
  familyId: 'f1',
  memberId: 'm1',
  name: 'Amoxicilina',
  dosage: '500 mg',
  instructions: null,
  startOn: '2026-11-05',
  endOn: '2026-11-11',
  sourceRecordId: null,
  origin: 'manual',
};

describe('createSupabaseMedicationRepository', () => {
  it('listByMember mapeia snake → camel e ordena por início desc', async () => {
    const m = createMockClient();
    m.fromQueue('medications', ok([row]));
    expect(await createSupabaseMedicationRepository(m.client).listByMember('m1')).toEqual([
      {
        id: 'md1',
        familyId: 'f1',
        memberId: 'm1',
        name: 'Amoxicilina',
        dosage: '500 mg',
        instructions: '1 cápsula de 8 em 8 horas',
        startOn: '2026-11-05',
        endOn: '2026-11-11',
        sourceRecordId: 'r1',
        origin: 'ocr',
        createdAt: '2026-11-05T12:00:00Z',
        updatedAt: '2026-11-05T12:00:00Z',
      },
    ]);
    expect(m.callsOf('from:medications')).toEqual(
      expect.arrayContaining([['eq', ['member_id', 'm1']], ['order', ['start_on', { ascending: false }]]]),
    );
  });

  it('listByFamily e listBySourceRecord filtram pela coluna certa', async () => {
    const m = createMockClient();
    m.fromQueue('medications', ok([]), ok([]));
    const repo = createSupabaseMedicationRepository(m.client);
    await repo.listByFamily('f1');
    await repo.listBySourceRecord('r1');
    expect(m.callsOf('from:medications')).toEqual(expect.arrayContaining([['eq', ['family_id', 'f1']], ['eq', ['source_record_id', 'r1']]]));
  });

  it('createMany insere em lote com as colunas exatas', async () => {
    const m = createMockClient();
    m.fromQueue('medications', ok([row]));
    await createSupabaseMedicationRepository(m.client).createMany([input]);
    expect(m.callsOf('from:medications')).toContainEqual([
      'insert',
      [
        [
          {
            family_id: 'f1',
            member_id: 'm1',
            name: 'Amoxicilina',
            dosage: '500 mg',
            instructions: null,
            start_on: '2026-11-05',
            end_on: '2026-11-11',
            source_record_id: null,
            origin: 'manual',
          },
        ],
      ],
    ]);
  });

  it('createMany vazio não chama o banco; check (23514) vira medication/invalid', async () => {
    const m = createMockClient();
    m.fromQueue('medications', fail({ code: '23514' }));
    const repo = createSupabaseMedicationRepository(m.client);
    expect(await repo.createMany([])).toEqual([]);
    await expect(repo.createMany([input])).rejects.toMatchObject({ code: 'medication/invalid' });
  });

  it('update manda só end_on ao encerrar; inexistente vira not-found', async () => {
    const m = createMockClient();
    m.fromQueue('medications', ok(row), fail({ code: 'PGRST116' }));
    const repo = createSupabaseMedicationRepository(m.client);
    await repo.update('md1', { endOn: '2026-11-11' });
    expect(m.callsOf('from:medications')).toContainEqual(['update', [{ end_on: '2026-11-11' }]]);
    await expect(repo.update('nada', { endOn: null })).rejects.toMatchObject({ code: 'medication/not-found' });
  });

  it('remove apaga pelo id e traduz falha', async () => {
    const m = createMockClient();
    m.fromQueue('medications', ok(null), fail({ message: 'boom' }));
    const repo = createSupabaseMedicationRepository(m.client);
    await repo.remove('md1');
    expect(m.callsOf('from:medications')).toContainEqual(['eq', ['id', 'md1']]);
    await expect(repo.remove('md1')).rejects.toMatchObject({ code: 'medication/remove-failed' });
  });
});
