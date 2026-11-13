import { CURRENT_TERMS_VERSION, hasValidConsent, type Consent } from './consent';

const c = (purpose: Consent['purpose'], over: Partial<Consent> = {}): Consent => ({
  purpose,
  version: CURRENT_TERMS_VERSION,
  acceptedAt: '2026-11-11T00:00:00Z',
  revokedAt: null,
  ...over,
});

describe('hasValidConsent', () => {
  it('exige termos e tratamento de dados de saúde na versão atual', () => {
    expect(hasValidConsent([c('terms_and_privacy'), c('health_data_processing')])).toBe(true);
    expect(hasValidConsent([c('terms_and_privacy')])).toBe(false);
  });
  it('rejeita versão antiga ou consentimento revogado', () => {
    expect(hasValidConsent([c('terms_and_privacy', { version: 'old' }), c('health_data_processing')])).toBe(false);
    expect(hasValidConsent([c('terms_and_privacy'), c('health_data_processing', { revokedAt: 'x' })])).toBe(false);
  });

  it('termo v2: o aceite da v1 não vale mais e exige novo aceite (spec P1)', () => {
    expect(CURRENT_TERMS_VERSION).toBe('2026-11-v2');
    const v1 = { version: '2026-11-v1' };
    expect(hasValidConsent([c('terms_and_privacy', v1), c('health_data_processing', v1)])).toBe(false);
  });
});
