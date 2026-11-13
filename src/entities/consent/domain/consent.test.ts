import {
  APP_CONSENT_VERSIONS,
  CURRENT_TERMS_VERSION,
  EMERGENCY_CARD_TERMS_VERSION,
  hasEmergencyCardConsent,
  hasValidAppConsent,
  hasValidConsent,
  type Consent,
} from './consent';

const c = (purpose: Consent['purpose'], over: Partial<Consent> = {}): Consent => ({
  purpose,
  version: CURRENT_TERMS_VERSION,
  acceptedAt: '2026-11-11T00:00:00Z',
  revokedAt: null,
  ...over,
});

const both = (version: string, over: Partial<Consent> = {}): Consent[] => [
  c('terms_and_privacy', { version, ...over }),
  c('health_data_processing', { version, ...over }),
];

describe('hasValidConsent', () => {
  it('exige as duas finalidades na versão pedida', () => {
    expect(hasValidConsent([c('terms_and_privacy'), c('health_data_processing')])).toBe(true);
    expect(hasValidConsent([c('terms_and_privacy')])).toBe(false);
  });

  it('rejeita versão diferente ou consentimento revogado', () => {
    expect(hasValidConsent([c('terms_and_privacy', { version: 'old' }), c('health_data_processing')])).toBe(false);
    expect(hasValidConsent([c('terms_and_privacy'), c('health_data_processing', { revokedAt: 'x' })])).toBe(false);
  });

  it('a versão gravada por um aceite novo é a v3', () => {
    expect(CURRENT_TERMS_VERSION).toBe('2026-11-v3');
    expect(EMERGENCY_CARD_TERMS_VERSION).toBe('2026-11-v3');
    expect(APP_CONSENT_VERSIONS).toEqual(['2026-11-v2', '2026-11-v3']);
  });
});

describe('matriz v1 / v2 / v3 / revogado', () => {
  const v1 = both('2026-11-v1');
  const v2 = both('2026-11-v2');
  const v3 = both('2026-11-v3');
  const revoked = both('2026-11-v3', { revokedAt: '2026-11-12T00:00:00Z' });

  it('v3 vale para o app e para a ficha', () => {
    expect(hasValidConsent(v3)).toBe(true);
    expect(hasValidAppConsent(v3)).toBe(true);
    expect(hasEmergencyCardConsent(v3)).toBe(true);
  });

  it('v2 vale para o app e não vale para a ficha', () => {
    expect(hasValidConsent(v2)).toBe(false);
    expect(hasValidAppConsent(v2)).toBe(true);
    expect(hasEmergencyCardConsent(v2)).toBe(false);
  });

  it('v1 e revogado não valem para o app nem para a ficha', () => {
    for (const rows of [v1, revoked, []]) {
      expect(hasValidConsent(rows)).toBe(false);
      expect(hasValidAppConsent(rows)).toBe(false);
      expect(hasEmergencyCardConsent(rows)).toBe(false);
    }
  });

  it('exige as duas finalidades na mesma versão', () => {
    const mixed = [c('terms_and_privacy', { version: '2026-11-v2' }), c('health_data_processing', { version: '2026-11-v3' })];
    expect(hasValidAppConsent(mixed)).toBe(false);
    expect(hasEmergencyCardConsent(mixed)).toBe(false);
    expect(hasValidAppConsent([c('terms_and_privacy', { version: '2026-11-v2' })])).toBe(false);
  });
});
