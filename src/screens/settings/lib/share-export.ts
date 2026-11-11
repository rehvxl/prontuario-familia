import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { DomainError } from '@/shared/lib';

export interface ExportFile {
  fileName: string;
  mimeType: string;
  content: string;
}

/** Grava a exportação no cache do app e abre a folha de compartilhamento do sistema. */
export async function shareExport({ fileName, mimeType, content }: ExportFile): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new DomainError('export/share-unavailable', 'Este aparelho não permite compartilhar arquivos.');
  }
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, UTI: 'public.json', dialogTitle: 'Exportar dados do Prontuário da Família' });
}
