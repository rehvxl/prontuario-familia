import { DomainError, toLocalIsoDate } from '@/shared/lib';
import type { DataExportGateway } from '@/entities/session';

export interface ExportedData {
  fileName: string;
  mimeType: 'application/json';
  /** JSON em texto, pronto para gravar em arquivo e compartilhar. */
  content: string;
}

/** Exporta os dados do titular (LGPD art. 18, II e V) como arquivo JSON nomeado pela data. */
export async function exportData({ dataExport }: { dataExport: DataExportGateway }, now: Date = new Date()): Promise<ExportedData> {
  const content = await dataExport.exportMyData();
  try {
    JSON.parse(content);
  } catch (cause) {
    throw new DomainError('export/invalid', 'A exportação veio incompleta. Tente novamente.', { cause });
  }
  return { fileName: `prontuario-familia-${toLocalIsoDate(now)}.json`, mimeType: 'application/json', content };
}
