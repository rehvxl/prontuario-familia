import { LOCAL_COLLECTIONS, newId } from '@/shared/lib';
import { createMemoryDb } from '@/shared/lib/testing';
import { emergencyCardFieldsSchema } from '../domain/schema';
import { createLocalEmergencyCardRepository } from './local-emergency-card-repository';

const empty = emergencyCardFieldsSchema.parse({});

async function setup() {
  const db = createMemoryDb();
  const member = { id: newId(), familyId: newId(), fullName: 'Ana Souza' };
  await db.put(LOCAL_COLLECTIONS.members, member.id, member);
  return { db, member, repo: createLocalEmergencyCardRepository(db) };
}

describe('createLocalEmergencyCardRepository', () => {
  it('grava a ficha vazia, relê e atualiza a mesma linha', async () => {
    const { repo, member } = await setup();
    expect(await repo.getByMember(member.id)).toBeNull();
    const created = await repo.upsert(member.id, member.familyId, empty);
    expect(created.bloodType).toBe('unknown');
    expect(created.memberId).toBe(member.id);
    const updated = await repo.upsert(member.id, member.familyId, emergencyCardFieldsSchema.parse({ bloodType: 'O+', notes: 'Usa marca-passo' }));
    expect(updated.id).toBe(created.id);
    expect(updated.bloodType).toBe('O+');
    expect(await repo.getByMember(member.id)).toMatchObject({ notes: 'Usa marca-passo' });
  });

  it('rejeita mutex e membro de outra família', async () => {
    const { repo, member } = await setup();
    await expect(repo.upsert(member.id, member.familyId, { ...empty, noKnownAllergies: true, allergies: [{ name: 'Dipirona', reaction: null }] })).rejects.toMatchObject({
      code: 'emergency-card/invalid',
    });
    await expect(repo.upsert(member.id, newId(), empty)).rejects.toMatchObject({ code: 'emergency-card/invalid' });
  });

  it('uma linha por membro; clear() não deixa documento', async () => {
    const { db, repo, member } = await setup();
    await repo.upsert(member.id, member.familyId, empty);
    expect(await db.list(LOCAL_COLLECTIONS.emergencyCards)).toHaveLength(1);
    await db.clear();
    expect(await db.list(LOCAL_COLLECTIONS.emergencyCards)).toEqual([]);
  });
});
