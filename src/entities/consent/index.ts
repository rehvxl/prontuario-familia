export {
  APP_CONSENT_VERSIONS,
  CURRENT_TERMS_VERSION,
  EMERGENCY_CARD_TERMS_VERSION,
  REQUIRED_PURPOSES,
  hasEmergencyCardConsent,
  hasValidAppConsent,
  hasValidConsent,
} from './domain/consent';
export type { Consent, ConsentPurpose, ConsentRepository } from './domain/consent';
export { LGPD_LAW_URL, TERMS_V2_PARAGRAPH, TERMS_V3_ADDENDUM, TERMS_V3_HEALTH_DESCRIPTION } from './domain/terms';
export { createLocalConsentRepository } from './data/local-consent-repository';
export { consentKeys, useMyConsents } from './model/queries';
export { useConsentRepository } from './model/dependencies';
export { createSupabaseConsentRepository } from './data/supabase-consent-repository';
