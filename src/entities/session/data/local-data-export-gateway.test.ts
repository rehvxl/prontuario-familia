import { LOCAL_COLLECTIONS } from '@/shared/lib';
import { createMemoryDb } from '@/shared/lib/testing';
import { createLocalDataExportGateway } from './local-data-export-gateway';
import { createLocalAuthGateway } from './local-auth-gateway';

describe('createLocalDataExportGateway', () => {
  it('exige sessão', async () => {
    await expect(createLocalDataExportGateway(createMemoryDb()).exportMyData()).rejects.toMatchObject({ code: 'auth/unauthenticated' });
  });

  it('exporta só os dados do usuário logado (família, pessoas, registros, consentimentos)', async () => {
    const db = createMemoryDb();
    const auth = createLocalAuthGateway(db);
    const me = await auth.verifyEmailOtp('ana@exemplo.com', '123456');
    await db.put(LOCAL_COLLECTIONS.families, 'f1', { id: 'f1', name: 'Silva', ownerId: me.id });
    await db.put(LOCAL_COLLECTIONS.families, 'f2', { id: 'f2', name: 'Outra', ownerId: 'outro' });
    await db.put(LOCAL_COLLECTIONS.members, 'm1', { id: 'm1', familyId: 'f1', fullName: 'Ana' });
    await db.put(LOCAL_COLLECTIONS.members, 'm2', { id: 'm2', familyId: 'f2', fullName: 'Estranho' });
    await db.put(LOCAL_COLLECTIONS.records, 'r1', { id: 'r1', familyId: 'f1', title: 'Hemograma' });
    await db.put(LOCAL_COLLECTIONS.records, 'r2', { id: 'r2', familyId: 'f2', title: 'Alheio' });
    await db.put(LOCAL_COLLECTIONS.consents, 'x', { id: 'x', userId: me.id, purpose: 'terms_and_privacy' });
    await db.put(LOCAL_COLLECTIONS.consents, 'y', { id: 'y', userId: 'outro', purpose: 'terms_and_privacy' });

    const json = await createLocalDataExportGateway(db).exportMyData();
    const data = JSON.parse(json);

    expect(data.user.email).toBe('ana@exemplo.com');
    expect(data.families.map((f: { id: string }) => f.id)).toEqual(['f1']);
    expect(data.members.map((m: { fullName: string }) => m.fullName)).toEqual(['Ana']);
    expect(data.records.map((r: { title: string }) => r.title)).toEqual(['Hemograma']);
    expect(data.consents).toHaveLength(1);
    expect(json).not.toContain('Estranho');
    expect(json).not.toContain('Alheio');
  });

  it('exporta as coleções de saúde da família, inclusive a ficha, no nível de cima', async () => {
    const db = createMemoryDb();
    const me = await createLocalAuthGateway(db).verifyEmailOtp('ana@exemplo.com', '123456');
    await db.put(LOCAL_COLLECTIONS.families, 'f1', { id: 'f1', name: 'Silva', ownerId: me.id });
    await db.put(LOCAL_COLLECTIONS.families, 'f2', { id: 'f2', name: 'Outra', ownerId: 'outro' });
    const collections = {
      measurements: LOCAL_COLLECTIONS.measurements,
      vaccineDoses: LOCAL_COLLECTIONS.vaccineDoses,
      medications: LOCAL_COLLECTIONS.medications,
      vaccineRuleDismissals: LOCAL_COLLECTIONS.vaccineRuleDismissals,
      emergencyCards: LOCAL_COLLECTIONS.emergencyCards,
    };
    for (const c of Object.values(collections)) {
      await db.put(c, `${c}-meu`, { id: `${c}-meu`, familyId: 'f1', memberId: 'm1' });
      await db.put(c, `${c}-alheio`, { id: `${c}-alheio`, familyId: 'f2', memberId: 'm2' });
    }

    const json = await createLocalDataExportGateway(db).exportMyData();
    const data = JSON.parse(json);

    for (const [key, c] of Object.entries(collections)) {
      expect(data[key].map((d: { id: string }) => d.id)).toEqual([`${c}-meu`]);
    }
    expect(json).not.toContain('alheio');
    expect(data.format_version).toBe(3);
  });
});
