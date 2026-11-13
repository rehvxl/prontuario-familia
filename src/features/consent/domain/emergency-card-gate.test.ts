import { hasEmergencyCardConsent, hasValidAppConsent, type Consent, type ConsentRepository } from '@/entities/consent';
import { acceptRequiredConsents } from './accept-required-consents';
import { declineEmergencyCardConsent, emergencyCardStillBlocked } from './emergency-card-gate';

const v2 = (purpose: Consent['purpose']): Consent => ({
  purpose,
  version: '2026-11-v2',
  acceptedAt: '2026-11-01T00:00:00Z',
  revokedAt: null,
});

/** Imita a RPC: encerra a linha da versão anterior e insere a nova, com histórico. */
function historyRepo(initial: Consent[]) {
  const store = [...initial];
  const revoke = jest.fn(async (purpose: Consent['purpose']) => {
    const current = store.find((c) => c.purpose === purpose && c.revokedAt === null);
    if (current) current.revokedAt = '2026-11-12T00:00:00Z';
  });
  const repo: ConsentRepository = {
    listMine: async () => store.map((c) => ({ ...c })),
    accept: async (purpose, version) => {
      const current = store.find((c) => c.purpose === purpose && c.revokedAt === null);
      if (current && current.version !== version) current.revokedAt = '2026-11-12T00:00:00Z';
      const row: Consent = { purpose, version, acceptedAt: '2026-11-12T00:00:00Z', revokedAt: null };
      store.push(row);
      return row;
    },
    revoke,
  };
  return { repo, revoke, store };
}

describe('porta da ficha e recusa da v3', () => {
  it('recusar não chama revoke, mantém a v2 no app e a ficha bloqueada', async () => {
    const { repo, revoke } = historyRepo([v2('terms_and_privacy'), v2('health_data_processing')]);
    const after = await declineEmergencyCardConsent(repo);
    expect(revoke).not.toHaveBeenCalled();
    expect(hasValidAppConsent(after)).toBe(true);
    expect(hasEmergencyCardConsent(after)).toBe(false);
    expect(emergencyCardStillBlocked(after)).toBe(true);
    // Reabrir a ficha mostra o termo de novo: a porta continua fechada.
    expect(hasEmergencyCardConsent(await repo.listMine())).toBe(false);
  });

  it('aceitar a v3 grava a versão atual, preserva a v2 no histórico e libera a ficha', async () => {
    const { repo, store } = historyRepo([v2('terms_and_privacy'), v2('health_data_processing')]);
    const after = await acceptRequiredConsents({ consents: repo }, { termsAndPrivacy: true, healthData: true });
    expect(hasEmergencyCardConsent(after)).toBe(true);
    expect(hasValidAppConsent(after)).toBe(true);
    const active = store.filter((c) => c.revokedAt === null);
    expect(active.map((c) => c.version)).toEqual(['2026-11-v3', '2026-11-v3']);
    expect(active.every((c) => c.acceptedAt.length > 0)).toBe(true);
    const retired = store.filter((c) => c.version === '2026-11-v2');
    expect(retired).toHaveLength(2);
    expect(retired.every((c) => c.revokedAt !== null)).toBe(true);
    expect(await repo.listMine()).toEqual(expect.arrayContaining(retired.map((c) => expect.objectContaining({ version: '2026-11-v2' }))));
  });
});
