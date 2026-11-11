import { useMutation } from '@tanstack/react-query';
import { useDataExportGateway } from '@/entities/session';
import { exportData } from '../domain/export-data';

/** Gera a exportação. `data` = `{ fileName, mimeType, content }`; gravar e compartilhar fica para a tela. */
export function useExportData() {
  const dataExport = useDataExportGateway();
  return useMutation({ mutationFn: () => exportData({ dataExport }) });
}
