import { LOCAL_COLLECTIONS } from '@/shared/lib';
import { createMemoryDb } from '@/shared/lib/testing';
import type { NewVaccineDose } from '../domain/types';
import { createLocalVaccineDoseRepository } from './local-vaccine-dose-repository';

async function setup() {
  const db = createMemoryDb();
  await db.put(LOCAL_COLLECTIONS.members, 'm1', { id: 'm1', familyId: 'f1' });
  await db.put(LOCAL_COLLECTIONS.members, 'm2', { id: 'm2', familyId: 'f1' });
  await db.put(LOCAL_COLLECTIONS.members, 'mB', { id: 'mB', familyId: 'fB' });
  await db.put(LOCAL_COLLECTIONS.records, 'r1', { id: 'r1', familyId: 'f1', memberId: 'm1', attachments: [] });
  return { db, repo: createLocalVaccineDoseRepository(db) };
}

const input = (extra: Partial<NewVaccineDose> = {}): NewVaccineDose => ({
  familyId: 'f1',
  memberId: 'm1',
  vaccineCode: 'penta',
  vaccineName: null,
  doseKey: 'D1',
  doseLabel: '1ª dose',
  appliedOn: '2026-03-10',
  lot: null,
  location: null,
  sourceRecordId: null,
  origin: 'manual',
  ...extra,
});

describe('createLocalVaccineDoseRepository', () => {
  it('createMany grava e lista por pessoa, família e documento, com a data mais recente primeiro', async () => {
    const { repo } = await setup();
    const created = await repo.createMany([
      input(),
      input({ doseKey: 'D2', appliedOn: '2026-05-10', sourceRecordId: 'r1', origin: 'ocr' }),
      input({ doseKey: 'D3', appliedOn: null }),
      input({ memberId: 'mB', familyId: 'fB' }),
    ]);
    expect(created.map((d) => d.id)).toHaveLength(4);
    expect(created[0]).toMatchObject({ createdAt: expect.any(String), updatedAt: expect.any(String) });

    expect((await repo.listByMember('m1')).map((d) => d.appliedOn)).toEqual(['2026-05-10', '2026-03-10', null]);
    expect(await repo.listByFamily('f1')).toHaveLength(3);
    expect((await repo.listBySourceRecord('r1')).map((d) => d.doseKey)).toEqual(['D2']);
  });

  it('é atômico: um item inválido não grava nenhum', async () => {
    const { repo } = await setup();
    await expect(repo.createMany([input(), input({ memberId: 'mB' })])).rejects.toMatchObject({ code: 'vaccine/invalid-reference' });
    expect(await repo.listByMember('m1')).toEqual([]);
  });

  it('confere pessoa da família, documento da mesma pessoa e nome em "other"', async () => {
    const { repo } = await setup();
    await expect(repo.createMany([input({ familyId: 'fB' })])).rejects.toMatchObject({ code: 'vaccine/invalid-reference' });
    await expect(repo.createMany([input({ memberId: 'm2', sourceRecordId: 'r1' })])).rejects.toMatchObject({ code: 'vaccine/invalid-reference' });
    await expect(repo.createMany([input({ sourceRecordId: 'nao-existe' })])).rejects.toMatchObject({ code: 'vaccine/invalid-reference' });
    await expect(repo.createMany([input({ vaccineCode: 'other', vaccineName: ' ' })])).rejects.toMatchObject({ code: 'vaccine/invalid-dose' });
  });

  it('mesma dose na mesma data não duplica; doses sem data não colidem', async () => {
    const { repo } = await setup();
    await repo.createMany([input()]);
    await expect(repo.createMany([input()])).rejects.toMatchObject({ code: 'vaccine/duplicate-dose' });
    await expect(repo.createMany([input({ appliedOn: '2026-04-10' }), input({ appliedOn: '2026-04-10' })])).rejects.toMatchObject({
      code: 'vaccine/duplicate-dose',
    });
    await expect(repo.createMany([input({ appliedOn: null }), input({ appliedOn: null })])).resolves.toHaveLength(2);
  });

  it('update aplica mudanças, confere o único e falha em dose inexistente', async () => {
    const { repo } = await setup();
    const [first, second] = await repo.createMany([input(), input({ doseKey: 'D2', appliedOn: '2026-05-10' })]);
    const updated = await repo.update(second!.id, { lot: 'AB12' });
    expect(updated).toMatchObject({ lot: 'AB12', doseKey: 'D2' });
    await expect(repo.update(second!.id, { doseKey: 'D1', appliedOn: first!.appliedOn })).rejects.toMatchObject({ code: 'vaccine/duplicate-dose' });
    await expect(repo.update(first!.id, { appliedOn: '2026-03-10' })).resolves.toMatchObject({ id: first!.id });
    await expect(repo.update('x', { lot: null })).rejects.toMatchObject({ code: 'vaccine/not-found' });
  });

  it('remove apaga a dose', async () => {
    const { repo } = await setup();
    const [d] = await repo.createMany([input()]);
    await repo.remove(d!.id);
    expect(await repo.listByMember('m1')).toEqual([]);
  });

  it('"Não se aplica": uma por regra e pessoa, lista por pessoa e família, desfazer apaga', async () => {
    const { repo } = await setup();
    const dismissal = await repo.dismiss({ familyId: 'f1', memberId: 'm1', ruleId: 'varicella_d1', reason: 'had_disease', note: null });
    await repo.dismiss({ familyId: 'f1', memberId: 'm2', ruleId: 'varicella_d1', reason: 'other', note: 'x' });
    await expect(
      repo.dismiss({ familyId: 'f1', memberId: 'm1', ruleId: 'varicella_d1', reason: 'other', note: null }),
    ).rejects.toMatchObject({ code: 'vaccine/duplicate-dismissal' });
    await expect(
      repo.dismiss({ familyId: 'fB', memberId: 'm1', ruleId: 'bcg_du', reason: 'other', note: null }),
    ).rejects.toMatchObject({ code: 'vaccine/invalid-reference' });

    expect(await repo.listDismissals('m1')).toEqual([dismissal]);
    expect(await repo.listFamilyDismissals('f1')).toHaveLength(2);
    await repo.undismiss(dismissal.id);
    expect(await repo.listDismissals('m1')).toEqual([]);
  });
});
