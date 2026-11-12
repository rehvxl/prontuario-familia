import type { ReferenceFlag } from './types';

/**
 * R1: compara o valor com a faixa impressa no laudo. Limites inclusivos (igual ao limite fica `in`);
 * só piso ou só teto vale; sem limite → `none` ("Sem faixa no laudo").
 * Não se aplica a `kind = 'vital'` (S3): quem chama não passa sinais vitais por aqui.
 */
export function computeFlag(value: number, low: number | null, high: number | null): ReferenceFlag {
  if (low === null && high === null) return 'none';
  if (low !== null && value < low) return 'low';
  if (high !== null && value > high) return 'high';
  return 'in';
}
