import { formatDecimal, formatShortDate } from '@/shared/lib';
import { formatMeasurementValue } from '../domain/format-value';
import type { Measurement } from '../domain/types';

/** A1 (spec §3.3): rodapé de toda tela com exames. Texto exato; não reescrever. */
export const LAB_REFERENCE_NOTICE = 'A faixa de referência é a impressa no laudo. Só o profissional de saúde pode interpretar o resultado.';

const withUnit = (value: string, unit: string) => (unit ? `${value} ${unit}` : value);

/** Valor do resultado em pt-BR, com as casas do analito, e a unidade ("1,0 mg/dL", "250.000 /mm³"). */
export function measurementValueText(m: Pick<Measurement, 'code' | 'value' | 'unit'>): string {
  return withUnit(formatMeasurementValue(m), m.unit);
}

/**
 * Faixa impressa no laudo, para "Faixa do laudo: …". O texto do laudo vence (é o que está impresso);
 * sem texto, os limites numéricos ("70–99 mg/dL", "até 5,7 %", "a partir de 40 mg/dL"). `null` sem faixa.
 */
export function referenceRangeText(m: Pick<Measurement, 'referenceLow' | 'referenceHigh' | 'referenceText' | 'unit'>): string | null {
  if (m.referenceText) return m.referenceText;
  const { referenceLow: low, referenceHigh: high } = m;
  if (low !== null && high !== null) return withUnit(`${formatDecimal(low)}–${formatDecimal(high)}`, m.unit);
  if (high !== null) return withUnit(`até ${formatDecimal(high)}`, m.unit);
  if (low !== null) return withUnit(`a partir de ${formatDecimal(low)}`, m.unit);
  return null;
}

/**
 * Origem do resultado (S5): "Do documento {título}, {data}" ou "Registrado por você". A entity não conhece
 * o registro: quem chama passa o título e a data do documento de origem, quando houver.
 */
export function measurementOriginText(m: Pick<Measurement, 'sourceRecordId'>, record?: { title: string; date: string } | null): string {
  if (record) return `Do documento ${record.title}, ${formatShortDate(record.date)}`;
  // Documento ainda carregando (ou indisponível): a origem continua sendo um documento.
  return m.sourceRecordId ? 'Do documento' : 'Registrado por você';
}
