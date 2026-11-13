export type Entitlement = 'emergency_card';

/**
 * Hoje sempre liberado. Único lugar que um paywall futuro deve passar a consultar um plano.
 * Sem SDK pago e sem UI de bloqueio nesta entrega.
 */
export function isEntitled(_feature: Entitlement): boolean {
  return true;
}
