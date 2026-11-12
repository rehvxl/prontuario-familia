import { formatShortDate } from '@/shared/lib';
import { computeFlag, formatMeasurementValue, latestOutOfRange, seriesKey, type Measurement } from '@/entities/measurement';
import type { Member } from '@/entities/member';
import { doseLabelOf, evaluateVaccines, isUpToDate, vaccineLabel } from '@/entities/vaccine';
import type { RuleEvaluation, VaccineDose, VaccineRuleDismissal, VaccineStatus } from '@/entities/vaccine';

export type AttentionKind = 'vaccine-late' | 'lab-out-of-range' | 'vaccine-due' | 'vaccine-next';

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  memberId: string;
  date: string;
  /** "{Primeiro nome} · {o quê}", sem o estado (F7.3, protótipo v3): "Carlos · Glicose em jejum". */
  title: string;
  /** Estado em texto + valor ou dose + data, sem repetir o título: "Acima da faixa do laudo · 138 mg/dL · 12 de out.". */
  detail: string;
  target: { screen: 'vaccines'; memberId: string } | { screen: 'exam-series'; memberId: string; seriesKey: string };
}

export interface FamilyAttention {
  /** false → cartão oculto (F7.6). */
  hasHealthData: boolean;
  /** Todos, ordenados (F7.2); a tela mostra 5. */
  items: AttentionItem[];
  /** F7.4 */
  vaccines: { upToDate: number; total: number; withoutBirthDate: number };
}

/** F7.2: ordem por tipo. Dentro do tipo, a data mais antiga primeiro. Pessoas nunca são ordenadas (S9). */
const KIND_ORDER: AttentionKind[] = ['vaccine-late', 'lab-out-of-range', 'vaccine-due', 'vaccine-next'];

const VACCINE_KIND: Partial<Record<VaccineStatus, AttentionKind>> = {
  late: 'vaccine-late',
  due: 'vaccine-due',
  confirm: 'vaccine-due',
  next: 'vaccine-next',
};

/** Rótulos da R9 a R12 (spec §5 e F3.1). "Sem registro" nunca aparece no painel. */
const STATUS_LABEL: Partial<Record<VaccineStatus, string>> = {
  late: 'Atrasada pelo calendário',
  due: 'Pendente',
  confirm: 'Confirmar na carteira',
  next: 'Próxima',
};

const firstName = (member: Member) => member.fullName.trim().split(/\s+/)[0] ?? member.fullName;

/** '2026-10-12' → '12 de out.' no ano de hoje; de outro ano, com o ano ('12 de dez. de 2025'). */
function dayMonth(date: string, today: string): string {
  const full = formatShortDate(date);
  return date.slice(0, 4) === today.slice(0, 4) ? full.replace(/ de \d{4}$/, '') : full;
}

function vaccineItem(member: Member, e: RuleEvaluation, today: string): AttentionItem | null {
  const kind = VACCINE_KIND[e.status];
  const label = STATUS_LABEL[e.status];
  if (!kind || !label) return null;
  const name = vaccineLabel(e.rule.vaccineCode);
  const dose = e.rule.doseLabel ?? doseLabelOf(e.rule.doseKey);
  const doseText = dose.charAt(0).toLowerCase() + dose.slice(1);
  // Influenza (R12) é por ano civil: "Dirce · Influenza de 2026". As demais levam a dose: "Lia · Febre amarela (1ª dose)",
  // e o nome que já tem parênteses ganha a dose dentro deles: "Tríplice viral (SCR, 1ª dose)".
  const what =
    e.rule.doseKey === 'ANUAL' ? `${name} de ${today.slice(0, 4)}` : name.endsWith(')') ? `${name.slice(0, -1)}, ${doseText})` : `${name} (${doseText})`;
  const from = e.dueFrom && e.status !== 'confirm' ? ` · a partir de ${formatShortDate(e.dueFrom)}` : '';
  return {
    id: `${kind}:${member.id}:${e.rule.id}`,
    kind,
    memberId: member.id,
    date: e.dueFrom ?? today,
    title: `${firstName(member)} · ${what}`,
    detail: `${label}${from}`,
    target: { screen: 'vaccines', memberId: member.id },
  };
}

function labItem(member: Member, m: Measurement, today: string): AttentionItem {
  const state = computeFlag(m.value, m.referenceLow, m.referenceHigh) === 'high' ? 'Acima da faixa do laudo' : 'Abaixo da faixa do laudo';
  const key = seriesKey(m);
  return {
    id: `lab-out-of-range:${member.id}:${key}`,
    kind: 'lab-out-of-range',
    memberId: member.id,
    date: m.takenOn,
    title: `${firstName(member)} · ${m.label}`,
    detail: [state, [formatMeasurementValue(m), m.unit].filter(Boolean).join(' '), dayMonth(m.takenOn, today)].join(' · '),
    target: { screen: 'exam-series', memberId: member.id, seriesKey: key },
  };
}

export function buildFamilyAttention(input: {
  members: Member[];
  measurements: Measurement[];
  doses: VaccineDose[];
  dismissals: VaccineRuleDismissal[];
  today: string;
}): FamilyAttention {
  const { members, today } = input;
  const items: AttentionItem[] = [];
  const vaccines = { upToDate: 0, total: members.length, withoutBirthDate: 0 };

  for (const member of members) {
    const evaluation = evaluateVaccines({
      birthDate: member.birthDate,
      doses: input.doses.filter((d) => d.memberId === member.id),
      dismissals: input.dismissals.filter((d) => d.memberId === member.id),
      today,
    });
    if (evaluation.missingBirthDate) vaccines.withoutBirthDate += 1;
    else if (isUpToDate(evaluation)) vaccines.upToDate += 1;
    for (const e of evaluation.pending) {
      const item = vaccineItem(member, e, today);
      if (item) items.push(item);
    }
    const own = input.measurements.filter((m) => m.memberId === member.id);
    for (const m of latestOutOfRange(own, today)) items.push(labItem(member, m, today));
  }

  // sort é estável: empate de tipo e data mantém a ordem de cadastro das pessoas, sem pontuar ninguém.
  items.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.date.localeCompare(b.date));

  return {
    hasHealthData: input.measurements.length + input.doses.length + input.dismissals.length > 0,
    items,
    vaccines,
  };
}
