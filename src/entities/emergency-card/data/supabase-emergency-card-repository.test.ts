import { createMockClient, fail, ok } from '@/shared/api/mock-client';
import { emergencyCardFieldsSchema } from '../domain/schema';
import { createSupabaseEmergencyCardRepository } from './supabase-emergency-card-repository';

const memberId = '11111111-1111-4111-8111-111111111111';
const familyId = '22222222-2222-4222-8222-222222222222';
const cardId = '33333333-3333-4333-8333-333333333333';

const row = {
  id: cardId,
  family_id: familyId,
  member_id: memberId,
  blood_type: 'A-',
  no_known_allergies: false,
  allergies: [{ name: 'Dipirona', reaction: 'urticária' }],
  conditions: [],
  contacts: [{ name: 'Marina', relation: null, phone: '11999990000' }],
  notes: null,
  created_at: '2026-11-12T15:00:00.000Z',
  updated_at: '2026-11-12T15:00:00.000Z',
};

const draft = emergencyCardFieldsSchema.parse({
  bloodType: 'A-',
  allergies: [{ name: 'Dipirona', reaction: 'urticária' }],
  contacts: [{ name: 'Marina', phone: '11999990000' }],
});

describe('createSupabaseEmergencyCardRepository', () => {
  it('getByMember devolve null sem linha e mapeia a linha existente', async () => {
    const m = createMockClient();
    m.fromQueue('emergency_cards', ok(null), ok(row));
    const repo = createSupabaseEmergencyCardRepository(m.client);
    expect(await repo.getByMember(memberId)).toBeNull();
    expect(await repo.getByMember(memberId)).toMatchObject({ id: cardId, bloodType: 'A-', familyId, memberId });
    expect(m.callsOf('from:emergency_cards')).toEqual(expect.arrayContaining([['maybeSingle', []]]));
  });

  it('insert na primeira gravação e update só nas colunas liberadas', async () => {
    const created = createMockClient();
    created.fromQueue('emergency_cards', ok(null), ok(row));
    await createSupabaseEmergencyCardRepository(created.client).upsert(memberId, familyId, draft);
    const insert = created.callsOf('from:emergency_cards').find(([method]) => method === 'insert');
    expect(insert?.[1]).toEqual([
      {
        family_id: familyId,
        member_id: memberId,
        blood_type: 'A-',
        no_known_allergies: false,
        allergies: [{ name: 'Dipirona', reaction: 'urticária' }],
        conditions: [],
        contacts: [{ name: 'Marina', relation: null, phone: '11999990000' }],
        notes: null,
      },
    ]);

    const updated = createMockClient();
    updated.fromQueue('emergency_cards', ok(row), ok({ ...row, notes: 'Usa marca-passo' }));
    await createSupabaseEmergencyCardRepository(updated.client).upsert(memberId, familyId, emergencyCardFieldsSchema.parse({ ...draft, notes: 'Usa marca-passo' }));
    const patch = updated.callsOf('from:emergency_cards').find(([method]) => method === 'update');
    expect(patch?.[1]?.[0]).toEqual(expect.objectContaining({ blood_type: 'A-', notes: 'Usa marca-passo' }));
    expect(patch?.[1]?.[0]).not.toHaveProperty('family_id');
    expect(patch?.[1]?.[0]).not.toHaveProperty('member_id');
  });

  it('CHECK do banco vira emergency-card/invalid', async () => {
    const m = createMockClient();
    m.fromQueue('emergency_cards', ok(null), fail({ code: '23514', message: 'check' }));
    await expect(createSupabaseEmergencyCardRepository(m.client).upsert(memberId, familyId, draft)).rejects.toMatchObject({ code: 'emergency-card/invalid' });
  });
});
