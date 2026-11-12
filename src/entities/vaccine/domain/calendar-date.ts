// Aritmética de datas YYYY-MM-DD por calendário (R7): aniversário + meses, nunca dias / 30.
import type { ScheduleAge } from './types';

const pad = (n: number) => String(n).padStart(2, '0');
const parts = (iso: string) => iso.split('-').map(Number) as [number, number, number];

/** Soma meses de calendário; o dia que não existe no mês de destino vira o último dia (31/01 + 1 m = 28/02). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = parts(iso);
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = total - year * 12 + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${String(year).padStart(4, '0')}-${pad(month)}-${pad(Math.min(d, lastDay))}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = parts(iso);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Data em que a pessoa nascida em `birth` completa `age`. */
export const addAge = (birth: string, age: ScheduleAge): string => addDays(addMonths(birth, age.months), age.days ?? 0);

/** Meses completos de `birth` até `today`, coerente com `addMonths`. */
export function monthsBetween(birth: string, today: string): number {
  const [by, bm] = parts(birth);
  const [ty, tm] = parts(today);
  const months = (ty - by) * 12 + (tm - bm);
  return addMonths(birth, months) > today ? months - 1 : months;
}
