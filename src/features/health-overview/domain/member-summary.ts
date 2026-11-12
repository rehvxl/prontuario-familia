import { VITALS, buildSeries, latestOutOfRange, vitalSeries } from '@/entities/measurement';
import type { Measurement, MeasurementSeries, VitalCode } from '@/entities/measurement';
import { medicationStatus, type Medication } from '@/entities/medication';
import type { Member } from '@/entities/member';
import { evaluateVaccines, isUpToDate } from '@/entities/vaccine';
import type { RuleEvaluation, VaccineDose, VaccineRuleDismissal } from '@/entities/vaccine';

/** Itens por seção do Resumo (F6.2). */
export const SUMMARY_SECTION_MAX = 5;

export interface MemberHealthSummary {
  /**
   * `upToDate` segue a R14. `pendingCount` conta só Atrasada, Pendente e Confirmar na carteira, para nunca
   * mostrar "{n} pendências" quando a pessoa está em dia. `first` é a primeira de `pending` (pode ser Próxima).
   */
  vaccines: { missingBirthDate: boolean; upToDate: boolean; pendingCount: number; first: RuleEvaluation | null };
  /** ≤ 5, últimos 12 meses, fora da faixa primeiro (F6.2). */
  recentLabs: MeasurementSeries[];
  /** ≤ 5 (R5). */
  activeMedications: Medication[];
  vitals: Partial<Record<VitalCode, Measurement>>;
}

/** Mesmo dia, 12 meses antes (29/02 vira 28/02): a mesma janela da R15 em `latestOutOfRange`. */
function twelveMonthsBefore(today: string): string {
  const [y, m, d] = today.split('-').map(Number) as [number, number, number];
  const lastDay = new Date(Date.UTC(y - 1, m, 0)).getUTCDate();
  return `${String(y - 1).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`;
}

/** F6.2: último resultado de até 5 séries dos últimos 12 meses; fora da faixa (R15) primeiro, depois o mais recente. */
function recentLabsOf(measurements: Measurement[], today: string): MeasurementSeries[] {
  const from = twelveMonthsBefore(today);
  const outOfRange = new Set(latestOutOfRange(measurements, today).map((m) => m.id));
  return buildSeries(measurements) // já vem do resultado mais recente para o mais antigo
    .filter((s) => s.latest.takenOn >= from && s.latest.takenOn <= today)
    .map((s, index) => ({ s, index, out: outOfRange.has(s.latest.id) }))
    .sort((a, b) => Number(b.out) - Number(a.out) || a.index - b.index)
    .slice(0, SUMMARY_SECTION_MAX)
    .map(({ s }) => s);
}

export function buildMemberSummary(input: {
  member: Member;
  measurements: Measurement[];
  doses: VaccineDose[];
  dismissals: VaccineRuleDismissal[];
  medications: Medication[];
  today: string;
}): MemberHealthSummary {
  const { member, measurements, today } = input;
  const evaluation = evaluateVaccines({ birthDate: member.birthDate, doses: input.doses, dismissals: input.dismissals, today });

  const vitals: Partial<Record<VitalCode, Measurement>> = {};
  for (const { code } of VITALS) {
    const last = vitalSeries(measurements, code).at(-1);
    if (last) vitals[code] = last;
  }

  return {
    vaccines: {
      missingBirthDate: evaluation.missingBirthDate,
      upToDate: isUpToDate(evaluation),
      pendingCount: evaluation.pending.filter((p) => p.status !== 'next').length,
      first: evaluation.pending[0] ?? null,
    },
    recentLabs: recentLabsOf(measurements, today),
    activeMedications: input.medications.filter((m) => medicationStatus(m, today) === 'active').slice(0, SUMMARY_SECTION_MAX),
    vitals,
  };
}
