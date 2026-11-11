/** Utilitários de data puros (sem dependência de framework). Datas de negócio usam o dia local do usuário. */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `true` se `value` é uma data de calendário real no formato YYYY-MM-DD (rejeita 2026-02-30). */
export function isValidIsoDate(value: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** Dia local de `now` como YYYY-MM-DD. */
export function toLocalIsoDate(now: Date = new Date()): string {
  const y = String(now.getFullYear()).padStart(4, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
