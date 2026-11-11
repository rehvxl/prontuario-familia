import { File, Paths } from 'expo-file-system';
import { clearLocalFiles } from '@/shared/lib';
import { createLocalAttachmentStorage } from './local-attachment-storage';

const makePicked = (name: string, content = 'conteúdo') => {
  const f = new File(Paths.cache, name);
  f.create({ overwrite: true });
  f.write(content);
  return f;
};

describe('createLocalAttachmentStorage', () => {
  beforeEach(() => clearLocalFiles());

  it('copia para document/health-files/{familyId}/{recordId}/{id}.{ext} e preserva o original', async () => {
    const picked = makePicked('hemograma.PDF', 'pdf-bytes');
    const storage = createLocalAttachmentStorage();

    const stored = await storage.upload({
      familyId: 'fam1',
      recordId: 'rec1',
      file: { uri: picked.uri, fileName: 'hemograma.PDF', mimeType: 'application/pdf', sizeBytes: 9 },
    });

    expect(stored.storagePath).toMatch(/^fam1\/rec1\/[0-9a-f-]{36}\.pdf$/);
    expect(stored).toMatchObject({ fileName: 'hemograma.PDF', mimeType: 'application/pdf', sizeBytes: 9 });
    const copy = new File(Paths.document, 'health-files', ...stored.storagePath.split('/'));
    expect(copy.exists).toBe(true);
    expect(copy.textSync()).toBe('pdf-bytes');
    expect(picked.exists).toBe(true);
  });

  it('deduz a extensão do mime type quando o nome não tem extensão', async () => {
    const picked = makePicked('foto');
    const stored = await createLocalAttachmentStorage().upload({
      familyId: 'f',
      recordId: 'r',
      file: { uri: picked.uri, fileName: 'foto', mimeType: 'image/heic', sizeBytes: 5 },
    });
    expect(stored.storagePath.endsWith('.heic')).toBe(true);
  });

  it('getViewUrl devolve o uri local do arquivo e remove apaga só os caminhos pedidos', async () => {
    const storage = createLocalAttachmentStorage();
    const mk = async (name: string) =>
      storage.upload({
        familyId: 'f',
        recordId: 'r',
        file: { uri: makePicked(name).uri, fileName: name, mimeType: 'image/png', sizeBytes: 3 },
      });
    const [a, b] = [await mk('a.png'), await mk('b.png')];

    const url = await storage.getViewUrl(a.storagePath);
    expect(new File(url).exists).toBe(true);

    await storage.remove([a.storagePath, 'f/r/inexistente.png']);
    expect(new File(await storage.getViewUrl(a.storagePath)).exists).toBe(false);
    expect(new File(await storage.getViewUrl(b.storagePath)).exists).toBe(true);
  });

  it('falha se o arquivo de origem não existe (para o caso de uso poder desfazer)', async () => {
    await expect(
      createLocalAttachmentStorage().upload({
        familyId: 'f',
        recordId: 'r',
        file: { uri: 'file:///mock/cache/nao-existe.pdf', fileName: 'nao-existe.pdf', mimeType: 'application/pdf', sizeBytes: 1 },
      }),
    ).rejects.toThrow();
  });
});
