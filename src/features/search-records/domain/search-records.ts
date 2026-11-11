import { DomainError } from '@/shared/lib';
import type { HealthRecord, HealthRecordRepository, RecordQuery, RecordType } from '@/entities/health-record';

export const MIN_SEARCH_LENGTH = 2;

export interface SearchParams {
  familyId: string;
  text?: string;
  types?: RecordType[];
  memberId?: string;
}

/** Há o que buscar? (texto com 2+ caracteres, ou ao menos um tipo). Útil para habilitar a consulta na tela. */
export function isSearchable(params: Pick<SearchParams, 'text' | 'types'>): boolean {
  return (params.text?.trim().length ?? 0) >= MIN_SEARCH_LENGTH || (params.types?.length ?? 0) > 0;
}

/** Busca textual (acentos e caixa ignorados) + filtro por tipos. Texto com 1 caractere é erro; sem critério, lista vazia. */
export async function searchRecords({ records }: { records: HealthRecordRepository }, params: SearchParams): Promise<HealthRecord[]> {
  const text = params.text?.trim() ?? '';
  if (text.length > 0 && text.length < MIN_SEARCH_LENGTH) {
    throw new DomainError('search/query-too-short', `Digite pelo menos ${MIN_SEARCH_LENGTH} letras para buscar.`);
  }
  if (!isSearchable(params)) return [];
  const query: RecordQuery = {};
  if (text) query.text = text;
  if (params.types && params.types.length > 0) query.types = params.types;
  if (params.memberId) query.memberId = params.memberId;
  return records.list(params.familyId, query);
}
