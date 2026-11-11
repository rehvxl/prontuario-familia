import { DomainError, isDomainError } from '@/shared/lib';
import type { HealthRecordRepository } from '@/entities/health-record';

/** Exclui o registro e os arquivos anexados (a porta `records.remove` apaga os dois). A tela confirma antes. */
export async function deleteRecord({ records }: { records: HealthRecordRepository }, recordId: string): Promise<void> {
  if (!recordId) throw new DomainError('record/missing-id', 'Escolha o registro que será excluído.');
  try {
    await records.remove(recordId);
  } catch (cause) {
    if (isDomainError(cause)) throw cause;
    throw new DomainError('record/remove-failed', 'Não foi possível excluir o registro. Tente novamente; nada foi apagado.', { cause });
  }
}
