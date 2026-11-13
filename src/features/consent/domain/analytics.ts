/** Eventos da métrica do termo v3. No-op: não envia a lugar nenhum e não aceita valores. */
const CONSENT_EVENTS = ['consent_v3_shown', 'consent_v3_accepted', 'consent_v3_declined'] as const;

export type ConsentEventName = (typeof CONSENT_EVENTS)[number];

export function trackConsentEvent(name: string, payload?: Record<string, unknown>): void {
  if (!(CONSENT_EVENTS as readonly string[]).includes(name)) {
    throw new Error('evento de consentimento não permitido');
  }
  if (payload && Object.keys(payload).length > 0) {
    throw new Error('evento de consentimento não recebe valores');
  }
}
