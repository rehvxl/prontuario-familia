// Regras R7–R14 da spec (docs/features/v0.2-saude-da-familia.md §7). Datas comparadas como texto YYYY-MM-DD.
import { isValidIsoDate } from '@/shared/lib';
import { addAge, addDays, addMonths, monthsBetween } from './calendar-date';
import { VACCINE_SCHEDULE } from './schedule';
import type {
  RuleEvaluation,
  VaccineDose,
  VaccineEvaluation,
  VaccineRuleDismissal,
  VaccineScheduleRule,
  VaccineStatus,
} from './types';

/** Tolerância da spec (§13): 30 dias para "Próxima" antes e para "Pendente" depois da data recomendada. */
const TOLERANCE_DAYS = 30;
const PENDING_ORDER: VaccineStatus[] = ['late', 'due', 'confirm', 'next'];
/** "Calendário para a idade": regras da faixa atual e as que começam nesta janela (decisão da Head de Produto). */
const CALENDAR_LOOKAHEAD_MONTHS = 12;

type Result = { status: VaccineStatus; dueFrom: string | null };

interface Context {
  birth: string;
  today: string;
  doses: VaccineDose[];
  results: Map<string, Result>;
}

const at = (status: VaccineStatus, dueFrom: string | null): Result => ({ status, dueFrom });
const maxDate = (x: string, y: string) => (x > y ? x : y);

/** R9 a partir da data recomendada `rec`; `end` é o fim exclusivo da janela (o dia seguinte à véspera). */
function byRecommended(rec: string, end: string | null, today: string): Result {
  if (end !== null && today >= end) return at('noRecord', rec);
  if (today < addDays(rec, -TOLERANCE_DAYS)) return at('planned', rec);
  if (today < rec) return at('next', rec);
  if (today <= addDays(rec, TOLERANCE_DAYS)) return at('due', rec);
  return at('late', rec);
}

/** R8, mais "uma dose a partir de tal idade completa a regra". */
function isComplete(rule: VaccineScheduleRule, counted: VaccineDose[], birth: string): boolean {
  if (counted.length >= rule.ordinal) return true;
  if (!rule.completedByDoseFromAge) return false;
  const from = addAge(birth, rule.completedByDoseFromAge);
  return counted.some((d) => d.appliedOn !== null && d.appliedOn >= from);
}

/** R12: ano civil; criança sem dose em anos anteriores precisa de 2 no ano. Dose sem data não conta para o ano. */
function annual(rule: VaccineScheduleRule, counted: VaccineDose[], start: string, end: string | null, today: string): Result {
  if (today < start) return byRecommended(start, end, today);
  if (end !== null && today >= end) return at('noRecord', start);
  const year = today.slice(0, 4);
  const yearStart = `${year}-01-01`;
  const thisYear = counted
    .map((d) => d.appliedOn)
    .filter((d): d is string => d !== null && d.startsWith(year))
    .sort();
  const hadBefore = counted.some((d) => d.appliedOn === null || d.appliedOn < yearStart);
  const needed = rule.ordinal >= 2 && !hadBefore ? 2 : 1;
  if (thisYear.length >= needed) return at('applied', null);
  const [first] = thisYear;
  if (first !== undefined) {
    const from = addDays(first, rule.minIntervalFromPreviousDays ?? TOLERANCE_DAYS);
    return at(today >= from ? 'due' : 'next', from);
  }
  return at('due', maxDate(yearStart, start));
}

/** R11: próxima = última dose com data + intervalo; sem dose, Pendente (covid) ou o esquema básico pede a confirmação (dT). */
function periodic(rule: VaccineScheduleRule, counted: VaccineDose[], start: string, end: string | null, today: string): Result {
  const months = rule.repeatEveryMonths ?? 0;
  const last = counted
    .map((d) => d.appliedOn)
    .filter((d): d is string => d !== null)
    .sort()
    .at(-1);
  if (!last) {
    // dT sem dose com data: quem pede a confirmação é o esquema básico (dt_basic), para não repetir o item.
    if (counted.length < rule.ordinal && rule.ordinal > 1) return at('planned', null);
    if (today < start || (end !== null && today >= end)) return byRecommended(start, end, today);
    return counted.length > 0 ? at('confirm', start) : at('due', start);
  }
  return byRecommended(maxDate(addMonths(last, months), start), end, today);
}

function evaluateRule(rule: VaccineScheduleRule, ctx: Context): Result {
  const { birth, today } = ctx;
  const counted = ctx.doses.filter((d) => rule.countsAs.includes(d.vaccineCode));
  const start = addAge(birth, rule.windowStart);
  const end = rule.windowEnd ? addAge(birth, rule.windowEnd) : null;

  if (rule.doseKey === 'ANUAL') return annual(rule, counted, start, end, today);
  if (rule.repeatEveryMonths) return periodic(rule, counted, start, end, today);

  const rec = rule.recommended ? addAge(birth, rule.recommended) : null;
  if (isComplete(rule, counted, birth)) return at('applied', rec ?? start);
  if (rule.requiresRule && ctx.results.get(rule.requiresRule)?.status === 'noRecord') return at('noRecord', rec ?? start);
  if (rec) return byRecommended(rec, end, today);

  // R10: "conforme histórico" conta como pendência, mas nunca como atrasada.
  if (today < start) return at('planned', start);
  if (end !== null && today >= end) return at('noRecord', start);
  return at('confirm', start);
}

/** A faixa da regra inclui hoje, ou começa nos próximos 12 meses. */
function inCalendar(rule: VaccineScheduleRule, birth: string, today: string): boolean {
  const start = addAge(birth, rule.windowStart);
  if (start > today) return start <= addMonths(today, CALENDAR_LOOKAHEAD_MONTHS);
  return rule.windowEnd === null || today < addAge(birth, rule.windowEnd);
}

/** Mais recente primeiro; "Data não informada" por último. */
function sortApplied(doses: VaccineDose[]): VaccineDose[] {
  return [...doses].sort((x, y) => {
    if (x.appliedOn !== y.appliedOn) {
      if (x.appliedOn === null) return 1;
      if (y.appliedOn === null) return -1;
      return y.appliedOn.localeCompare(x.appliedOn);
    }
    return y.createdAt.localeCompare(x.createdAt);
  });
}

export function evaluateVaccines(input: {
  birthDate: string | null;
  doses: VaccineDose[];
  dismissals: VaccineRuleDismissal[];
  today: string;
}): VaccineEvaluation {
  const applied = sortApplied(input.doses);
  const birth = input.birthDate;
  if (!birth || !isValidIsoDate(birth)) {
    // R13: sem nascimento, nenhuma regra é calculada.
    return { missingBirthDate: true, pending: [], applied, calendar: [], other: [], notApplicable: [] };
  }

  const { today } = input;
  const dismissals = new Map(input.dismissals.map((d) => [d.ruleId, d]));
  const ctx: Context = { birth, today, doses: input.doses, results: new Map() };
  const age = monthsBetween(birth, today);

  const evaluations: RuleEvaluation[] = [];
  for (const rule of VACCINE_SCHEDULE.filter((r) => r.automatic)) {
    const result = evaluateRule(rule, ctx);
    ctx.results.set(rule.id, result);
    const dismissal = result.status === 'applied' ? null : (dismissals.get(rule.id) ?? null);
    evaluations.push({ rule, status: dismissal ? 'notApplicable' : result.status, dueFrom: result.dueFrom, dismissal });
  }

  // Com dose de dT/dTpa registrada, quem acompanha o toxoide é o reforço (R11): o esquema básico não repete o item.
  const boosterCovers =
    input.doses.some((d) => d.vaccineCode === 'dt' || d.vaccineCode === 'dtpa') && ctx.results.get('dt_booster')?.dueFrom != null;
  const pending = evaluations
    .filter((e) => PENDING_ORDER.includes(e.status) && !(boosterCovers && e.rule.id === 'dt_basic'))
    .map((e, index) => ({ e, index }))
    .sort(
      (x, y) =>
        PENDING_ORDER.indexOf(x.e.status) - PENDING_ORDER.indexOf(y.e.status) ||
        (x.e.dueFrom ?? '9999').localeCompare(y.e.dueFrom ?? '9999') ||
        x.index - y.index,
    )
    .map(({ e }) => e);

  return {
    missingBirthDate: false,
    pending,
    applied,
    calendar: evaluations.filter((e) => inCalendar(e.rule, birth, today) || pending.includes(e)),
    other: VACCINE_SCHEDULE.filter(
      (r) => !r.automatic && age >= r.windowStart.months && (r.windowEnd === null || age < r.windowEnd.months),
    ),
    notApplicable: evaluations.filter((e) => e.status === 'notApplicable'),
  };
}

/** R14: sem Pendente, Atrasada nem Confirmar na carteira. Sem data de nascimento não dá para dizer. */
export function isUpToDate(e: VaccineEvaluation): boolean {
  return !e.missingBirthDate && !e.pending.some((p) => p.status === 'late' || p.status === 'due' || p.status === 'confirm');
}
