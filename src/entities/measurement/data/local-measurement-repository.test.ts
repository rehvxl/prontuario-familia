import { LOCAL_COLLECTIONS, type LocalDb } from '@/shared/lib';
import { createMemoryDb } from '@/shared/lib/testing';
import type { MeasurementRepository } from '../domain/ports';
import type { NewMeasurement } from '../domain/types';
import { createLocalMeasurementRepository } from './local-measurement-repository';

const item = (over: Partial<NewMeasurement> = {}): NewMeasurement => ({
  familyId: 'f1',
  memberId: 'm1',
  kind: 'lab',
  code: 'hba1c',
  label: 'Hemoglobina glicada (HbA1c)',
  value: 6.1,
  value2: null,
  unit: '%',
  referenceLow: null,
  referenceHigh: 5.6,
  referenceText: null,
  takenOn: '2026-10-12',
  takenAt: null,
  context: null,
  note: null,
  sourceRecordId: null,
  origin: 'manual',
  ...over,
});

describe('createLocalMeasurementRepository', () => {
  let db: LocalDb;
  let repo: MeasurementRepository;
  beforeEach(async () => {
    db = createMemoryDb();
    repo = createLocalMeasurementRepository(db);
    await db.put(LOCAL_COLLECTIONS.members, 'm1', { id: 'm1', familyId: 'f1' });
    await db.put(LOCAL_COLLECTIONS.members, 'm2', { id: 'm2', familyId: 'f1' });
    await db.put(LOCAL_COLLECTIONS.members, 'm9', { id: 'm9', familyId: 'f2' });
    await db.put(LOCAL_COLLECTIONS.records, 'r1', { id: 'r1', familyId: 'f1', memberId: 'm1', attachments: [] });
    await db.put(LOCAL_COLLECTIONS.records, 'r2', { id: 'r2', familyId: 'f1', memberId: 'm2', attachments: [] });
  });

  it('createMany grava com id e datas e lista por pessoa em ordem cronológica', async () => {
    const created = await repo.createMany([item({ takenOn: '2026-10-12' }), item({ takenOn: '2025-04-01' })]);
    expect(created).toHaveLength(2);
    expect(created[0]).toMatchObject({ code: 'hba1c', value: 6.1 });
    expect(created[0]!.id).toBeTruthy();
    expect(created[0]!.createdAt).toBe(created[0]!.updatedAt);
    expect((await repo.listByMember('m1')).map((m) => m.takenOn)).toEqual(['2025-04-01', '2026-10-12']);
    expect(await repo.createMany([])).toEqual([]);
  });

  it('filtra por pessoa e por família', async () => {
    await repo.createMany([item(), item({ memberId: 'm2' }), item({ familyId: 'f2', memberId: 'm9' })]);
    expect(await repo.listByMember('m1')).toHaveLength(1);
    expect(await repo.listByFamily('f1')).toHaveLength(2);
    expect(await repo.listByFamily('f2')).toHaveLength(1);
  });

  it('listBySourceRecord devolve só os itens do documento', async () => {
    await repo.createMany([item({ sourceRecordId: 'r1' }), item({ code: 'hdl', label: 'Colesterol HDL', sourceRecordId: 'r1' }), item()]);
    await repo.createMany([item({ memberId: 'm2', sourceRecordId: 'r2' })]);
    expect((await repo.listBySourceRecord('r1')).map((m) => m.code).sort()).toEqual(['hba1c', 'hdl']);
    expect(await repo.listBySourceRecord('r2')).toHaveLength(1);
    expect(await repo.listBySourceRecord('nada')).toEqual([]);
  });

  it('único: um analito do catálogo por documento; "other" pode repetir', async () => {
    await repo.createMany([item({ sourceRecordId: 'r1' })]);
    await expect(repo.createMany([item({ sourceRecordId: 'r1' })])).rejects.toMatchObject({ code: 'measurement/duplicate' });
    await expect(repo.createMany([item({ code: 'tsh', sourceRecordId: 'r1' }), item({ code: 'tsh', sourceRecordId: 'r1' })])).rejects.toMatchObject({
      code: 'measurement/duplicate',
    });
    await repo.createMany([
      item({ code: 'other', label: 'Homocisteína', sourceRecordId: 'r1' }),
      item({ code: 'other', label: 'Lipase', sourceRecordId: 'r1' }),
    ]);
    await repo.createMany([item(), item()]); // sem documento não há único
    expect(await repo.listBySourceRecord('r1')).toHaveLength(3);
  });

  it('lote é tudo ou nada', async () => {
    await expect(repo.createMany([item(), item({ value2: 80 })])).rejects.toMatchObject({ code: 'measurement/invalid' });
    expect(await repo.listByMember('m1')).toEqual([]);
  });

  it('confere pessoa da família e documento da mesma pessoa', async () => {
    await expect(repo.createMany([item({ memberId: 'nada' })])).rejects.toMatchObject({ code: 'measurement/invalid' });
    await expect(repo.createMany([item({ familyId: 'f2' })])).rejects.toMatchObject({ code: 'measurement/invalid' });
    await expect(repo.createMany([item({ sourceRecordId: 'r2' })])).rejects.toMatchObject({ code: 'measurement/invalid' });
    await expect(repo.createMany([item({ sourceRecordId: 'nada' })])).rejects.toMatchObject({ code: 'measurement/invalid' });
  });

  it('confere as regras da tabela: diastólica só em bp, momento só na glicemia capilar, vital só manual, faixa e nota', async () => {
    const bp = { kind: 'vital' as const, code: 'bp', label: 'Pressão arterial', unit: 'mmHg', value: 120, referenceHigh: null };
    await expect(repo.createMany([item({ ...bp, value2: null })])).rejects.toMatchObject({ code: 'measurement/invalid' });
    await expect(repo.createMany([item({ context: 'fasting' })])).rejects.toMatchObject({ code: 'measurement/invalid' });
    await expect(repo.createMany([item({ ...bp, value2: 80, origin: 'ocr' })])).rejects.toMatchObject({ code: 'measurement/invalid' });
    await expect(repo.createMany([item({ referenceLow: 10, referenceHigh: 5 })])).rejects.toMatchObject({ code: 'measurement/invalid' });
    await expect(repo.createMany([item({ note: 'x'.repeat(141) })])).rejects.toMatchObject({ code: 'measurement/invalid' });
    await expect(repo.createMany([item({ code: 'Hba1c' })])).rejects.toMatchObject({ code: 'measurement/invalid' });
    const ok = await repo.createMany([
      item({ ...bp, value2: 80, takenAt: '08:30' }),
      item({ kind: 'vital', code: 'glucose_capillary', label: 'Glicemia capilar', unit: 'mg/dL', referenceHigh: null, context: 'post_meal' }),
    ]);
    expect(ok).toHaveLength(2);
  });

  it('update muda só as colunas permitidas, confere as regras e atualiza updatedAt', async () => {
    const [m] = await repo.createMany([item({ sourceRecordId: 'r1' })]);
    const updated = await repo.update(m!.id, { value: 5.9, note: 'refeito', memberId: 'm2', code: 'tsh' } as never);
    expect(updated).toMatchObject({ id: m!.id, value: 5.9, note: 'refeito', memberId: 'm1', code: 'hba1c', sourceRecordId: 'r1' });
    expect(await repo.listByMember('m1')).toEqual([updated]);
    await expect(repo.update(m!.id, { value2: 80 })).rejects.toMatchObject({ code: 'measurement/invalid' });
    await expect(repo.update('nada', { value: 1 })).rejects.toMatchObject({ code: 'measurement/not-found' });
  });

  it('remove apaga; remover de novo não falha', async () => {
    const [m] = await repo.createMany([item()]);
    await repo.remove(m!.id);
    await repo.remove(m!.id);
    expect(await repo.listByMember('m1')).toEqual([]);
  });
});
