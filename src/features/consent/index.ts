export { acceptRequiredConsents, assertExplicitConsent } from './domain/accept-required-consents';
export type { AcceptConsentsInput } from './domain/accept-required-consents';
export { trackConsentEvent } from './domain/analytics';
export type { ConsentEventName } from './domain/analytics';
export { declineEmergencyCardConsent, emergencyCardStillBlocked } from './domain/emergency-card-gate';
export { revokeConsents } from './domain/revoke-consents';
export { useAcceptRequiredConsents, useRevokeConsents } from './model/hooks';
