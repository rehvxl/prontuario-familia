import {
  hasEmergencyCardConsent,
  hasValidAppConsent,
  type Consent,
  type ConsentRepository,
} from '@/entities/consent';
import { trackConsentEvent } from './analytics';

/**
 * Recusar a v3 na porta da ficha. Não grava nada e não revoga a v2:
 * a pessoa volta ao resumo e o termo reaparece na próxima abertura.
 */
export async function declineEmergencyCardConsent(consents: ConsentRepository): Promise<Consent[]> {
  trackConsentEvent('consent_v3_declined');
  return consents.listMine();
}

export function emergencyCardStillBlocked(consents: Consent[]): boolean {
  return hasValidAppConsent(consents) && !hasEmergencyCardConsent(consents);
}
