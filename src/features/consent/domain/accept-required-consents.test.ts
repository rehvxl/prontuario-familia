import { CURRENT_TERMS_VERSION, type Consent, type ConsentPurpose, type ConsentRepository } from '@/entities/consent';
import { acceptRequiredConsents } from './accept-required-consents';

function fakeConsents(initial: Consent[] = [], opts: { dropAccepts?: boolean } = {}) {
  const store = [...initial];
  const accepted: string[] = [];
  const repo: ConsentRepository = {
    listMine: async () => [...store],
    accept: async (purpose: ConsentPurpose, version: string) => {
      accepted.push(`${purpose}@${version}`);
      const c: Consent = { purpose, version, acceptedAt: '2026-11-11T00:00:00Z', revokedAt: null };
      if (!opts.dropAccepts) {
        const i = store.findIndex((s) => s.purpose === purpose);
        if (i >= 0) store.splice(i, 1);
        store.push(c);
      }
      return c;
    },
    revoke: async () => undefined,
  };
  return { repo, accepted };
}

const both = { termsAndPrivacy: true, healthData: true };

describe('acceptRequiredConsents', () => {
  it('exige as duas confirmações explícitas e não grava nada sem elas', async () => {
    const { repo, accepted } = fakeConsents();
    for (const input of [
      { termsAndPrivacy: true, healthData: false },
      { termsAndPrivacy: false, healthData: true },
      { termsAndPrivacy: false, healthData: false },
    ]) {
      await expect(acceptRequiredConsents({ consents: repo }, input)).rejects.toMatchObject({ code: 'consent/required' });
    }
    expect(accepted).toEqual([]);
  });

  it('grava os dois propósitos na versão atual', async () => {
    const { repo, accepted } = fakeConsents();
    const result = await acceptRequiredConsents({ consents: repo }, both);
    expect(accepted).toEqual([`terms_and_privacy@${CURRENT_TERMS_VERSION}`, `health_data_processing@${CURRENT_TERMS_VERSION}`]);
    expect(result).toHaveLength(2);
  });

  it('é idempotente: não regrava o que já está válido', async () => {
    const valid: Consent = { purpose: 'terms_and_privacy', version: CURRENT_TERMS_VERSION, acceptedAt: 'x', revokedAt: null };
    const { repo, accepted } = fakeConsents([valid]);
    await acceptRequiredConsents({ consents: repo }, both);
    expect(accepted).toEqual([`health_data_processing@${CURRENT_TERMS_VERSION}`]);
  });

  it('pede novo aceite quando a versão mudou ou o consentimento foi revogado', async () => {
    const old: Consent[] = [
      { purpose: 'terms_and_privacy', version: 'antiga', acceptedAt: 'x', revokedAt: null },
      { purpose: 'health_data_processing', version: CURRENT_TERMS_VERSION, acceptedAt: 'x', revokedAt: 'y' },
    ];
    const { repo, accepted } = fakeConsents(old);
    await acceptRequiredConsents({ consents: repo }, both);
    expect(accepted).toHaveLength(2);
  });

  it('falha se o repositório não confirmou a gravação', async () => {
    const { repo } = fakeConsents([], { dropAccepts: true });
    await expect(acceptRequiredConsents({ consents: repo }, both)).rejects.toMatchObject({ code: 'consent/not-saved' });
  });
});
