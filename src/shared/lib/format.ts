/** Formatação pt-BR pura e determinística (não depende do Intl do aparelho). Entrada inválida volta como veio. */

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MONTHS_SHORT = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

/** Aceita 'YYYY-MM' ou 'YYYY-MM-DD' (o dia é opcional para mês/ano). */
const DATE = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/;

function parts(value: string): { year: string; month: number; day: number | null } | null {
  const m = DATE.exec(value);
  const month = m ? Number(m[2]) : 0;
  if (!m || month < 1 || month > 12) return null;
  return { year: m[1]!, month, day: m[3] ? Number(m[3]) : null };
}

/** 7.4 ou '7.4' → '7,4'; 250000 → '250.000'. Mantém as casas que vierem (não arredonda). */
export function formatDecimal(value: number | string): string {
  const raw = String(value);
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(raw);
  if (!m) return raw;
  const integer = m[2]!.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${m[1]}${integer}${m[3] ? `,${m[3]}` : ''}`;
}

/** '2026-10-12' → '12 de out. de 2026'. */
export function formatShortDate(isoDate: string): string {
  const p = parts(isoDate);
  if (!p || p.day === null) return isoDate;
  return `${p.day} de ${MONTHS_SHORT[p.month - 1]} de ${p.year}`;
}

/** '2026-10-12' ou '2026-10' → 'outubro de 2026'. */
export function formatMonthYear(isoDate: string): string {
  const p = parts(isoDate);
  return p ? `${MONTHS[p.month - 1]} de ${p.year}` : isoDate;
}

/** Rótulo de eixo do gráfico: '2025-03-14' → 'mar./25'. */
export function formatAxisDate(isoDate: string): string {
  const p = parts(isoDate);
  return p ? `${MONTHS_SHORT[p.month - 1]}/${p.year.slice(2)}` : isoDate;
}
