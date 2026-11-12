// Textos das linhas da carteira (spec F3, §5 e §7 do DESIGN_SYSTEM). Funções puras: a tela só compõe.
import { formatShortDate } from '@/shared/lib';
import { doseLabelOf, vaccineLabel, type RuleEvaluation, type VaccineDose } from '@/entities/vaccine';

/** Copy exata da spec §3.3. */
export const A3 = 'Referência do calendário público. Confirme com o profissional de saúde.';
export const A13 = 'As pendências consideram só as doses registradas no app.';
export const a12 = (firstName: string) => `Adicione a data de nascimento de ${firstName} para ver as vacinas do calendário.`;
export const emptyDoses = (firstName: string) => `Nenhuma dose registrada. Registre as vacinas que já estão na carteira de ${firstName}.`;

export const firstNameOf = (fullName: string) => fullName.trim().split(/\s+/)[0] ?? fullName;

const WITH_DATE = new Set(['late', 'due', 'next', 'planned']);
const countDoses = (n: number) => (n === 1 ? '1 dose registrada' : `${n} doses registradas`);

/** Influenza (R12) é por ano civil: "Influenza de 2026" (F7.3). */
export function ruleTitle(e: RuleEvaluation, today: string): string {
  const name = vaccineLabel(e.rule.vaccineCode);
  return e.rule.doseKey === 'ANUAL' ? `${name} de ${today.slice(0, 4)}` : name;
}

/** "1ª dose · a partir de 10 de jan. de 2027" (F3.9). "Conforme histórico" não tem data. */
export function ruleDetail(e: RuleEvaluation, reasonLabel?: string): string {
  const dose = e.rule.doseLabel ?? doseLabelOf(e.rule.doseKey);
  if (reasonLabel) return `${dose} · ${reasonLabel}`;
  return e.dueFrom && WITH_DATE.has(e.status) ? `${dose} · a partir de ${formatShortDate(e.dueFrom)}` : dose;
}

/** Doses registradas que contam para a regra (R8); na influenza, as do ano civil (R12). */
export function ruleDoses(e: RuleEvaluation, doses: VaccineDose[], today: string): string {
  const counted = doses.filter((d) => e.rule.countsAs.includes(d.vaccineCode));
  if (e.rule.doseKey === 'ANUAL') {
    const year = today.slice(0, 4);
    const n = counted.filter((d) => d.appliedOn?.startsWith(year)).length;
    return n === 0 ? `Nenhuma dose registrada em ${year}` : `${countDoses(n)} em ${year}`;
  }
  return counted.length === 0 ? 'Nenhuma dose registrada' : countDoses(counted.length);
}

/** "1ª dose · 15 de out. de 2026" ou "… · Data não informada" (F3.1). */
export const doseDetail = (d: VaccineDose) => `${d.doseLabel} · ${d.appliedOn ? formatShortDate(d.appliedOn) : 'Data não informada'}`;

/** "Lote PN2205 · UBS Jardim Botânico". */
export const doseExtra = (d: VaccineDose) => [d.lot ? `Lote ${d.lot}` : null, d.location].filter(Boolean).join(' · ') || undefined;

export const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
