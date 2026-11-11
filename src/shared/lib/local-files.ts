import { Directory, File, Paths } from 'expo-file-system';

/** Armazenamento local de anexos do modo demonstração: `Paths.document/health-files/{storagePath}`. */
const ROOT = 'health-files';

const fileAt = (storagePath: string) => new File(Paths.document, ROOT, ...storagePath.split('/'));

/** Copia um arquivo local escolhido pelo usuário para o armazenamento do app e devolve o uri final. */
export async function copyIntoLocalFiles(sourceUri: string, storagePath: string): Promise<string> {
  const segments = storagePath.split('/');
  const target = new File(Paths.document, ROOT, ...segments);
  new Directory(Paths.document, ROOT, ...segments.slice(0, -1)).create({ intermediates: true, idempotent: true });
  await new File(sourceUri).copy(target, { overwrite: true });
  return target.uri;
}

export function localFileUri(storagePath: string): string {
  return fileAt(storagePath).uri;
}

/** Remove arquivos; ignora os que já não existem. */
export function removeLocalFiles(storagePaths: string[]): void {
  for (const p of storagePaths) {
    const f = fileAt(p);
    if (f.exists) f.delete();
  }
}

/** Apaga todos os anexos locais (exclusão de conta). */
export function clearLocalFiles(): void {
  const dir = new Directory(Paths.document, ROOT);
  if (dir.exists) dir.delete();
}
