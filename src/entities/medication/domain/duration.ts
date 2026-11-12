import type { MedicationDuration } from './types';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * R6: "por N dias" → startOn + (N − 1) dias (o dia de início conta); "uso contínuo" → null;
 * sem informação → undefined (a pessoa escolhe; "não sei" nunca é salvo).
 * N que não é inteiro ≥ 1, ou data inválida, também volta undefined: melhor pedir a escolha que gravar fim errado.
 */
export function medicationEndOn(startOn: string, duration: MedicationDuration): string | null | undefined {
  if (duration.kind === 'continuous') return null;
  if (duration.kind === 'unknown' || !Number.isInteger(duration.days) || duration.days < 1) return undefined;
  const m = ISO_DATE.exec(startOn);
  if (!m) return undefined;
  const end = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + duration.days - 1));
  return end.toISOString().slice(0, 10);
}
