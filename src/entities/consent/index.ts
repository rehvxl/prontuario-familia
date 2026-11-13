export { CURRENT_TERMS_VERSION, REQUIRED_PURPOSES, hasValidConsent } from './domain/consent';
export type { Consent, ConsentPurpose, ConsentRepository } from './domain/consent';
export { TERMS_EMERGENCY_CARD_ADDENDUM, TERMS_HEALTH_DESCRIPTION, TERMS_V2_PARAGRAPH } from './domain/terms';
export { createLocalConsentRepository } from './data/local-consent-repository';
export { consentKeys, useMyConsents } from './model/queries';
export { useConsentRepository } from './model/dependencies';
export { createSupabaseConsentRepository } from './data/supabase-consent-repository';
