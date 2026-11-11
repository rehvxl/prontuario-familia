import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { HealthRecord, RecordType } from '../domain/health-record';
import { filterByTypes, groupByMonth, type MonthGroup } from '../domain/timeline';
import { useAttachmentStorage, useHealthRecordRepository } from './dependencies';

export const recordKeys = {
  all: ['records'] as const,
  /** Prefixo de todas as linhas do tempo (invalidar após remover pessoa/conta). */
  timelines: ['records', 'timeline'] as const,
  timeline: (familyId: string, memberId: string) => ['records', 'timeline', familyId, memberId] as const,
  /** Prefixo de todas as buscas. */
  searches: ['records', 'search'] as const,
  search: (familyId: string, params: unknown) => ['records', 'search', familyId, params] as const,
  detail: (id: string) => ['records', 'detail', id] as const,
  /** Contagem de registros por pessoa (home). */
  counts: (familyId: string) => ['records', 'counts', familyId] as const,
  /** Prefixo de todas as contagens. */
  allCounts: ['records', 'counts'] as const,
};

/**
 * Linha do tempo de uma pessoa: busca todos os registros dela uma vez e filtra por tipo no cliente
 * (trocar o filtro é instantâneo, sem nova consulta). `data` já vem agrupado por mês, do mais recente ao mais antigo.
 */
export function useMemberTimeline(familyId: string | undefined, memberId: string | undefined, types?: readonly RecordType[]) {
  const records = useHealthRecordRepository();
  const typesKey = types?.join(',') ?? '';
  const select = useCallback(
    (all: HealthRecord[]): MonthGroup[] => groupByMonth(filterByTypes(all, typesKey ? (typesKey.split(',') as RecordType[]) : undefined)),
    [typesKey],
  );
  return useQuery({
    queryKey: recordKeys.timeline(familyId ?? '', memberId ?? ''),
    queryFn: () => records.list(familyId ?? '', { memberId }),
    enabled: !!familyId && !!memberId,
    select,
  });
}

/** Quantos registros cada pessoa tem (`memberId` → total), para a home. */
export function useRecordCounts(familyId: string | undefined) {
  const records = useHealthRecordRepository();
  return useQuery({
    queryKey: recordKeys.counts(familyId ?? ''),
    queryFn: async () => {
      const all = await records.list(familyId ?? '');
      const counts: Record<string, number> = {};
      for (const r of all) counts[r.memberId] = (counts[r.memberId] ?? 0) + 1;
      return counts;
    },
    enabled: !!familyId,
  });
}

export function useRecord(id: string | undefined) {
  const records = useHealthRecordRepository();
  return useQuery({ queryKey: recordKeys.detail(id ?? ''), queryFn: () => records.getById(id ?? ''), enabled: !!id });
}

/** URL temporária do anexo (assinada no Supabase; uri local no modo demo). Renovada antes de expirar. */
export function useAttachmentUrl(storagePath: string | undefined) {
  const storage = useAttachmentStorage();
  return useQuery({
    queryKey: ['records', 'attachment-url', storagePath ?? ''],
    queryFn: () => storage.getViewUrl(storagePath ?? '', 300),
    enabled: !!storagePath,
    staleTime: 240_000,
    gcTime: 240_000,
  });
}
