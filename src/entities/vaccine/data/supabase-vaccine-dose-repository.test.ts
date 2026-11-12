import { createMockClient, fail, ok } from '@/shared/api/mock-client';
import type { NewVaccineDose, VaccineDose } from '../domain/types';
import { createSupabaseVaccineDoseRepository } from './supabase-vaccine-dose-repository';

const row = {
  id: 'd1',
  family_id: 'f1',
  member_id: 'm1',
  vaccine_code: 'other',
  vaccine_name: 'Herpes-zóster',
  dose_key: 'D1',
  dose_label: '1ª dose',
  applied_on: null,
  lot: 'AB12',
  location: 'UBS Centro',
  source_record_id: 'r1',
  origin: 'ocr',
  created_at: '2026-11-01T10:00:00Z',
  updated_at: '2026-11-02T10:00:00Z',
};
const newDose: NewVaccineDose = {
  familyId: 'f1',
  memberId: 'm1',
  vaccineCode: 'other',
  vaccineName: 'Herpes-zóster',
  doseKey: 'D1',
  doseLabel: '1ª dose',
  appliedOn: null,
  lot: 'AB12',
  location: 'UBS Centro',
  sourceRecordId: 'r1',
  origin: 'ocr',
};
const dose: VaccineDose = { ...newDose, id: 'd1', createdAt: '2026-11-01T10:00:00Z', updatedAt: '2026-11-02T10:00:00Z' };
const dismissalRow = { id: 'x1', family_id: 'f1', member_id: 'm1', rule_id: 'varicella_d1', reason: 'had_disease', note: null, created_at: '2026-11-01T10:00:00Z' };
const dismissal = { id: 'x1', familyId: 'f1', memberId: 'm1', ruleId: 'varicella_d1', reason: 'had_disease', note: null, createdAt: '2026-11-01T10:00:00Z' };

const DOSE_COLUMNS = 'id,family_id,member_id,vaccine_code,vaccine_name,dose_key,dose_label,applied_on,lot,location,source_record_id,origin,created_at,updated_at';

describe('createSupabaseVaccineDoseRepository', () => {
  it('listByMember usa as colunas do §2, filtra e ordena (sem data por último)', async () => {
    const m = createMockClient();
    m.fromQueue('vaccine_doses', ok([row]));
    expect(await createSupabaseVaccineDoseRepository(m.client).listByMember('m1')).toEqual([dose]);
    expect(m.callsOf('from:vaccine_doses')).toEqual([
      ['select', [DOSE_COLUMNS]],
      ['eq', ['member_id', 'm1']],
      ['order', ['applied_on', { ascending: false, nullsFirst: false }]],
      ['order', ['created_at', { ascending: false }]],
    ]);
  });

  it('listByFamily e listBySourceRecord filtram pela coluna certa', async () => {
    const m = createMockClient();
    m.fromQueue('vaccine_doses', ok([]), ok([row]));
    const repo = createSupabaseVaccineDoseRepository(m.client);
    await repo.listByFamily('f1');
    expect(await repo.listBySourceRecord('r1')).toEqual([dose]);
    expect(m.callsOf('from:vaccine_doses').filter(([method]) => method === 'eq')).toEqual([
      ['eq', ['family_id', 'f1']],
      ['eq', ['source_record_id', 'r1']],
    ]);
  });

  it('createMany envia snake_case num insert só; lista vazia não chama o banco', async () => {
    const m = createMockClient();
    m.fromQueue('vaccine_doses', ok([row]));
    const repo = createSupabaseVaccineDoseRepository(m.client);
    expect(await repo.createMany([])).toEqual([]);
    expect(await repo.createMany([newDose])).toEqual([dose]);
    expect(m.callsOf('from:vaccine_doses')).toContainEqual([
      'insert',
      [[{
        family_id: 'f1', member_id: 'm1', vaccine_code: 'other', vaccine_name: 'Herpes-zóster', dose_key: 'D1', dose_label: '1ª dose',
        applied_on: null, lot: 'AB12', location: 'UBS Centro', source_record_id: 'r1', origin: 'ocr',
      }]],
    ]);
  });

  it('traduz erros do Postgres nos mesmos códigos do adaptador local', async () => {
    const m = createMockClient();
    m.fromQueue('vaccine_doses', fail({ code: '23505' }), fail({ code: '23503' }), fail({ code: '23514' }), fail({ message: 'x' }));
    const repo = createSupabaseVaccineDoseRepository(m.client);
    await expect(repo.createMany([newDose])).rejects.toMatchObject({ code: 'vaccine/duplicate-dose' });
    await expect(repo.createMany([newDose])).rejects.toMatchObject({ code: 'vaccine/invalid-reference' });
    await expect(repo.createMany([newDose])).rejects.toMatchObject({ code: 'vaccine/invalid-dose' });
    await expect(repo.createMany([newDose])).rejects.toMatchObject({ code: 'vaccine/create-failed' });
  });

  it('update manda só as chaves informadas; sem linha → not-found', async () => {
    const m = createMockClient();
    m.fromQueue('vaccine_doses', ok({ ...row, lot: null }), ok(null));
    const repo = createSupabaseVaccineDoseRepository(m.client);
    expect(await repo.update('d1', { lot: null, appliedOn: '2026-03-10' })).toMatchObject({ lot: null });
    expect(m.callsOf('from:vaccine_doses')).toContainEqual(['update', [{ lot: null, applied_on: '2026-03-10' }]]);
    await expect(repo.update('x', { lot: 'A' })).rejects.toMatchObject({ code: 'vaccine/not-found' });
  });

  it('remove e undismiss apagam pelo id', async () => {
    const m = createMockClient();
    m.fromQueue('vaccine_doses', ok(null));
    m.fromQueue('vaccine_rule_dismissals', ok(null));
    const repo = createSupabaseVaccineDoseRepository(m.client);
    await repo.remove('d1');
    await repo.undismiss('x1');
    expect(m.callsOf('from:vaccine_doses')).toEqual([['delete', []], ['eq', ['id', 'd1']]]);
    expect(m.callsOf('from:vaccine_rule_dismissals')).toEqual([['delete', []], ['eq', ['id', 'x1']]]);
  });

  it('dispensas: lista por pessoa e família, grava e traduz o único', async () => {
    const m = createMockClient();
    m.fromQueue('vaccine_rule_dismissals', ok([dismissalRow]), ok([]), ok(dismissalRow), fail({ code: '23505' }));
    const repo = createSupabaseVaccineDoseRepository(m.client);
    expect(await repo.listDismissals('m1')).toEqual([dismissal]);
    expect(await repo.listFamilyDismissals('f1')).toEqual([]);
    const input = { familyId: 'f1', memberId: 'm1', ruleId: 'varicella_d1', reason: 'had_disease' as const, note: null };
    expect(await repo.dismiss(input)).toEqual(dismissal);
    expect(m.callsOf('from:vaccine_rule_dismissals')).toContainEqual([
      'insert',
      [{ family_id: 'f1', member_id: 'm1', rule_id: 'varicella_d1', reason: 'had_disease', note: null }],
    ]);
    await expect(repo.dismiss(input)).rejects.toMatchObject({ code: 'vaccine/duplicate-dismissal' });
  });
});
