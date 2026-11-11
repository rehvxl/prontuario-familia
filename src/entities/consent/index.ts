export { CURRENT_TERMS_VERSION, REQUIRED_PURPOSES, hasValidConsent } from './domain/consent';
export type { Consent, ConsentPurpose, ConsentRepository } from './domain/consent';
export { createLocalConsentRepository } from './data/local-consent-repository';
export { consentKeys, useMyConsents } from './model/queries';
export { useConsentRepository } from './model/dependencies';
export { createSupabaseConsentRepository } from './data/supabase-consent-repository';
