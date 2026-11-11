import type { HealthRecord, RecordType } from './health-record';

export interface MonthGroup {
  /** 'YYYY-MM' */
  month: string;
  records: HealthRecord[];
}

/** Ordem canônica da linha do tempo: `date` desc, depois `createdAt` desc. */
export function sortRecords(records: readonly HealthRecord[]): HealthRecord[] {
  return [...records].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

/** Filtra por tipos. Lista vazia/indefinida = todos os tipos. */
export function filterByTypes(records: readonly HealthRecord[], types?: readonly RecordType[]): HealthRecord[] {
  if (!types || types.length === 0) return [...records];
  const allowed = new Set<RecordType>(types);
  return records.filter((r) => allowed.has(r.type));
}

/** Agrupa por mês ('YYYY-MM'), meses do mais recente ao mais antigo; dentro do mês, ordem canônica. */
export function groupByMonth(records: readonly HealthRecord[]): MonthGroup[] {
  const groups = new Map<string, HealthRecord[]>();
  for (const record of sortRecords(records)) {
    const month = record.date.slice(0, 7);
    const bucket = groups.get(month);
    if (bucket) bucket.push(record);
    else groups.set(month, [record]);
  }
  return [...groups.entries()].map(([month, list]) => ({ month, records: list }));
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** 'YYYY-MM' → 'novembro de 2026'. Devolve a entrada se não for um mês válido. */
export function monthLabel(month: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  const name = m ? MONTHS[Number(m[2]) - 1] : undefined;
  return m && name ? `${name} de ${m[1]}` : month;
}
