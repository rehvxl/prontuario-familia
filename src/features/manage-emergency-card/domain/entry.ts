import { isEntitled } from '@/shared/lib';

export type EmergencyEntry = 'card' | 'paywall';

/** Único gancho do paywall antes de abrir a ficha. */
export function resolveEmergencyEntry(): EmergencyEntry {
  return isEntitled('emergency_card') ? 'card' : 'paywall';
}
