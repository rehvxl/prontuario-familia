import { isEntitled } from '@/shared/lib';

export type EmergencyEntry = 'card' | 'consent' | 'paywall';

/** Único gancho do paywall e da guarda do termo v3 antes de abrir a ficha. */
export function resolveEmergencyEntry(hasCardConsent: boolean): EmergencyEntry {
  if (!isEntitled('emergency_card')) return 'paywall';
  return hasCardConsent ? 'card' : 'consent';
}
