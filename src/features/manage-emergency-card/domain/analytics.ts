const ALLOWED = new Set(['emergency_card_opened', 'emergency_card_saved', 'emergency_card_present_mode']);

/**
 * Analytics da ficha, hoje no-op: não envia a lugar nenhum e não aceita valor clínico.
 * `emergency_card_saved` pode levar só `{ filledFieldCount }`.
 */
export function trackEmergencyCardEvent(name: string, payload?: Record<string, unknown>): void {
  if (!ALLOWED.has(name)) throw new Error('evento não permitido');
  if (!payload) return;
  const keys = Object.keys(payload);
  if (keys.length === 0) return;
  if (name !== 'emergency_card_saved' || keys.some((key) => key !== 'filledFieldCount') || typeof payload.filledFieldCount !== 'number') {
    throw new Error('não recebe valores');
  }
}
