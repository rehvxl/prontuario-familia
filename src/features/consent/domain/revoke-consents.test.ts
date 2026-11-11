import { hasValidConsent, type Consent, type ConsentPurpose, type ConsentRepository } from '@/entities/consent';
import { revokeConsents } from './revoke-consents';

function fakeRepo(): ConsentRepository {
  const list: Consent[] = (['terms_and_privacy', 'health_data_processing'] as ConsentPurpose[]).map((purpose) => ({
    purpose,
    version: '2026-11-v1',
    acceptedAt: 'x',
    revokedAt: null,
  }));
  return {
    listMine: async () => list.map((c) => ({ ...c })),
    accept: async () => list[0] as Consent,
    revoke: async (purpose) => {
      const c = list.find((x) => x.purpose === purpose);
      if (c) c.revokedAt = 'now';
    },
  };
}

describe('revokeConsents', () => {
  it('revoga os dois consentimentos e devolve a lista atualizada', async () => {
    const consents = fakeRepo();
    expect(hasValidConsent(await consents.listMine())).toBe(true);
    const after = await revokeConsents({ consents });
    expect(after.every((c) => c.revokedAt !== null)).toBe(true);
    expect(hasValidConsent(after)).toBe(false);
  });
});
