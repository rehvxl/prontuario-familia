import { Directory, File, Paths } from 'expo-file-system';
import { getContentUriAsync } from 'expo-file-system/legacy';
import { startActivityAsync } from 'expo-intent-launcher';

const VIEW_ACTION = 'android.intent.action.VIEW';
const FLAG_GRANT_READ_URI_PERMISSION = 1;

/**
 * Android: o PDF é aberto no leitor do sistema. Se o arquivo está na web (URL assinada), baixa antes para o
 * cache do app; arquivo do próprio app (modo demo) é aberto direto. O leitor recebe um `content://` temporário.
 */
export async function openPdfOnAndroid(uri: string, fileName: string): Promise<void> {
  let localUri = uri;
  if (/^https?:/i.test(uri)) {
    const folder = new Directory(Paths.cache, 'attachment-viewer');
    folder.create({ intermediates: true, idempotent: true });
    const safeName = fileName.replace(/[^\w.-]+/g, '_') || 'documento.pdf';
    const downloaded = await File.downloadFileAsync(uri, new File(folder, safeName), { idempotent: true });
    localUri = downloaded.uri;
  }
  const data = await getContentUriAsync(localUri);
  await startActivityAsync(VIEW_ACTION, { data, type: 'application/pdf', flags: FLAG_GRANT_READ_URI_PERMISSION });
}
