/** Datas de calendário 'YYYY-MM-DD' sem fuso: nunca use `new Date('2024-03-12')` (vira UTC e pode mudar o dia). */

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MONTHS_SHORT = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 'YYYY-MM-DD' → Date local (meia-noite). Retorna null se inválida. */
export function parseISODate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = ISO.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

/** Date → 'YYYY-MM-DD' usando a data local. */
export function toISODate(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type DateFormat = 'long' | 'short' | 'numeric' | 'monthYear';

/**
 * Formata 'YYYY-MM-DD' em pt-BR.
 * long: "12 de março de 2024" · short: "12 mar. 2024" · numeric: "12/03/2024" · monthYear: "março de 2024".
 */
export function formatDate(value: string | null | undefined, format: DateFormat = 'long'): string {
  const date = parseISODate(value);
  if (!date) return '';
  const d = date.getDate();
  const mi = date.getMonth();
  const y = date.getFullYear();
  switch (format) {
    case 'short':
      return `${d} ${MONTHS_SHORT[mi]} ${y}`;
    case 'numeric':
      return `${String(d).padStart(2, '0')}/${String(mi + 1).padStart(2, '0')}/${y}`;
    case 'monthYear':
      return `${MONTHS[mi]} de ${y}`;
    default:
      return `${d} de ${MONTHS[mi]} de ${y}`;
  }
}
