import { LOCAL_COLLECTIONS, type LocalDb } from '@/shared/lib';
import { createMemoryDb } from '@/shared/lib/testing';
import type { MedicationRepository } from '../domain/ports';
import type { NewMedication } from '../domain/types';
import { createLocalMedicationRepository } from './local-medication-repository';

const item = (over: Partial<NewMedication> = {}): NewMedication => ({
  familyId: 'f1',
  memberId: 'm1',
  name: 'Losartana',
  dosage: '50 mg',
  instructions: '1 comprimido pela manhã',
  startOn: '2026-01-10',
  endOn: null,
  sourceRecordId: null,
  origin: 'manual',
  ...over,
});

describe('createLocalMedicationRepository', () => {
  let db: LocalDb;
  let repo: MedicationRepository;
  beforeEach(async () => {
    db = createMemoryDb();
    repo = createLocalMedicationRepository(db);
    await db.put(LOCAL_COLLECTIONS.members, 'm1', { id: 'm1', familyId: 'f1' });
    await db.put(LOCAL_COLLECTIONS.members, 'm2', { id: 'm2', familyId: 'f1' });
    await db.put(LOCAL_COLLECTIONS.records, 'r1', { id: 'r1', familyId: 'f1', memberId: 'm1', attachments: [] });
  });

  it('createMany grava e lista por pessoa, início mais recente primeiro', async () => {
    const created = await repo.createMany([item({ name: 'A', startOn: '2026-01-10' }), item({ name: 'B', startOn: '2026-11-05' })]);
    expect(created.every((m) => m.id && m.createdAt === m.updatedAt)).toBe(true);
    expect((await repo.listByMember('m1')).map((m) => m.name)).toEqual(['B', 'A']);
    expect(await repo.createMany([])).toEqual([]);
  });

  it('filtra por pessoa, família e documento de origem', async () => {
    await repo.createMany([item({ sourceRecordId: 'r1', origin: 'ocr' }), item({ memberId: 'm2' })]);
    expect(await repo.listByMember('m2')).toHaveLength(1);
    expect(await repo.listByFamily('f1')).toHaveLength(2);
    expect((await repo.listBySourceRecord('r1')).map((m) => m.origin)).toEqual(['ocr']);
    expect(await repo.listBySourceRecord('nada')).toEqual([]);
  });

  it('fim antes do início, pessoa de outra família ou documento de outra pessoa são recusados (tudo ou nada)', async () => {
    await expect(repo.createMany([item(), item({ endOn: '2026-01-09' })])).rejects.toMatchObject({ code: 'medication/invalid' });
    await expect(repo.createMany([item({ familyId: 'f2' })])).rejects.toMatchObject({ code: 'medication/invalid' });
    await expect(repo.createMany([item({ memberId: 'm2', sourceRecordId: 'r1' })])).rejects.toMatchObject({ code: 'medication/invalid' });
    await expect(repo.createMany([item({ name: ' ' })])).rejects.toMatchObject({ code: 'medication/invalid' });
    expect(await repo.listByFamily('f1')).toEqual([]);
    expect(await repo.createMany([item({ endOn: '2026-01-10' })])).toHaveLength(1);
  });

  it('update grava o fim de uso, só nas colunas permitidas, e confere fim ≥ início', async () => {
    const [m] = await repo.createMany([item()]);
    const ended = await repo.update(m!.id, { endOn: '2026-11-11', memberId: 'm2' } as never);
    expect(ended).toMatchObject({ endOn: '2026-11-11', memberId: 'm1' });
    await expect(repo.update(m!.id, { endOn: '2025-12-31' })).rejects.toMatchObject({ code: 'medication/invalid' });
    await expect(repo.update('nada', { endOn: null })).rejects.toMatchObject({ code: 'medication/not-found' });
  });

  it('remove é idempotente', async () => {
    const [m] = await repo.createMany([item()]);
    await repo.remove(m!.id);
    await repo.remove(m!.id);
    expect(await repo.listByMember('m1')).toEqual([]);
  });
});
