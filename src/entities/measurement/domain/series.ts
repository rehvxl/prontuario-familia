import { normalizeSearchText } from '@/shared/lib';
import { computeFlag } from './reference';
import type { Measurement, MeasurementSeries, VitalCode } from './types';

/** Ordem cronológica: takenOn, depois takenAt (sem hora vem antes) e createdAt para desempate estável. */
export function compareByTakenOn(a: Measurement, b: Measurement): number {
  return (
    a.takenOn.localeCompare(b.takenOn) ||
    (a.takenAt ?? '').localeCompare(b.takenAt ?? '') ||
    a.createdAt.localeCompare(b.createdAt)
  );
}

/** R2: code, ou label normalizado (minúsculas, sem acento, espaços colapsados) em 'other'. */
export function seriesKey(m: Pick<Measurement, 'code' | 'label'>): string {
  return m.code === 'other' ? normalizeSearchText(m.label) : m.code;
}

/** R4: banda só quando todos os pontos do gráfico têm o mesmo piso e o mesmo teto numéricos. */
function bandOf(chart: Measurement[]): MeasurementSeries['band'] {
  const first = chart[0];
  if (!first || first.referenceLow === null || first.referenceHigh === null) return null;
  const { referenceLow: low, referenceHigh: high } = first;
  return chart.every((m) => m.referenceLow === low && m.referenceHigh === high) ? { low, high } : null;
}

/** R2–R4. Só kind 'lab'. Séries do resultado mais recente para o mais antigo. */
export function buildSeries(measurements: Measurement[]): MeasurementSeries[] {
  const groups = new Map<string, Measurement[]>();
  for (const m of measurements) {
    if (m.kind !== 'lab') continue;
    const key = seriesKey(m);
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  const series: MeasurementSeries[] = [];
  for (const [key, group] of groups) {
    const points = [...group].sort(compareByTakenOn);
    const latest = points[points.length - 1]!;
    const chart = points.filter((m) => m.unit === latest.unit);
    series.push({
      key,
      code: latest.code,
      label: latest.label,
      unit: latest.unit,
      points,
      latest,
      chart,
      offChart: points.filter((m) => m.unit !== latest.unit),
      band: bandOf(chart),
    });
  }
  return series.sort((a, b) => compareByTakenOn(b.latest, a.latest) || a.label.localeCompare(b.label));
}

/** Mesmo dia, 12 meses antes (29/02 vira 28/02). */
function twelveMonthsBefore(today: string): string {
  const [y, m, d] = today.split('-').map(Number) as [number, number, number];
  const lastDay = new Date(Date.UTC(y - 1, m, 0)).getUTCDate();
  return `${String(y - 1).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`;
}

/** R15: resultado mais recente de cada série, nos últimos 12 meses (inclusive o mesmo dia de um ano atrás) e fora da faixa (R1). */
export function latestOutOfRange(measurements: Measurement[], today: string): Measurement[] {
  const from = twelveMonthsBefore(today);
  return buildSeries(measurements)
    .map((s) => s.latest)
    .filter((m) => m.takenOn >= from && m.takenOn <= today)
    .filter((m) => {
      const flag = computeFlag(m.value, m.referenceLow, m.referenceHigh);
      return flag === 'high' || flag === 'low';
    });
}

/** Sinal vital de um código, em ordem cronológica e sem faixa (S3). */
export function vitalSeries(measurements: Measurement[], code: VitalCode): Measurement[] {
  return measurements.filter((m) => m.kind === 'vital' && m.code === code).sort(compareByTakenOn);
}
