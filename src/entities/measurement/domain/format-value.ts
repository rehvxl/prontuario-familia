import { formatDecimal } from '@/shared/lib';
import { findAnalyte, VITALS } from './analyte-catalog';
import type { Measurement } from './types';

/** Casas que o próprio número traz (1.08 → 2). Notação científica não passa por aqui (valores de saúde). */
const ownDecimals = (value: number) => (String(value).split('.')[1] ?? '').length;

function catalogDecimals(code: string, unit: string): number | null {
  if (code === 'height' && unit === 'm') return 2;
  return findAnalyte(code)?.decimals ?? VITALS.find((v) => v.code === code)?.decimals ?? null;
}

/**
 * Valor em pt-BR com as casas usuais do analito: creatinina 1 → "1,0", densidade 1.02 → "1,020", plaquetas 250000 → "250.000".
 * Nunca corta casas que o número já tem (1,08 continua 1,08). 'other' e código desconhecido: as casas do próprio número.
 */
export function formatMeasurementValue(m: Pick<Measurement, 'code' | 'value' | 'unit'>): string {
  if (!Number.isFinite(m.value) || /e/i.test(String(m.value))) return formatDecimal(m.value);
  const decimals = Math.max(catalogDecimals(m.code, m.unit) ?? 0, ownDecimals(m.value));
  return formatDecimal(m.value.toFixed(decimals));
}
