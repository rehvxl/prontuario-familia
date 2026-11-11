import { useQuery } from '@tanstack/react-query';
import { recordKeys, useHealthRecordRepository } from '@/entities/health-record';
import { isSearchable, searchRecords, type SearchParams } from '../domain/search-records';

/** Busca global. Só consulta quando há 2+ caracteres de texto ou algum tipo selecionado. */
export function useSearchRecords(params: SearchParams) {
  const records = useHealthRecordRepository();
  const { familyId, text, types, memberId } = params;
  return useQuery({
    queryKey: recordKeys.search(familyId, { text: text?.trim() ?? '', types: types ?? [], memberId: memberId ?? null }),
    queryFn: () => searchRecords({ records }, params),
    enabled: !!familyId && isSearchable(params),
  });
}
