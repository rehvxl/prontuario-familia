import { File } from 'expo-file-system';
import { createMockClient, fail } from '@/shared/api/mock-client';
import { createSupabaseAttachmentStorage } from './supabase-attachment-storage';

jest.mock('expo-file-system', () => ({ File: jest.fn() }));

const mockFile = (bytes: number, shouldFail = false) =>
  (File as unknown as jest.Mock).mockImplementation(() => ({
    arrayBuffer: shouldFail ? jest.fn().mockRejectedValue(new Error('no file')) : jest.fn().mockResolvedValue(new ArrayBuffer(bytes)),
  }));

const local = { uri: 'file:///tmp/laudo.pdf', fileName: 'laudo.pdf', mimeType: 'application/pdf', sizeBytes: 100 };

describe('createSupabaseAttachmentStorage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('upload envia os bytes ao bucket privado no caminho {família}/{registro}/{id}.{ext}', async () => {
    mockFile(100);
    const m = createMockClient();

    const result = await createSupabaseAttachmentStorage(m.client).upload({ familyId: 'f1', recordId: 'r1', file: local });

    expect(File).toHaveBeenCalledWith('file:///tmp/laudo.pdf');
    expect(m.bucket).toHaveBeenCalledWith('health-files');
    expect(result.storagePath).toBe(`f1/r1/${result.id}.pdf`);
    expect(result).toMatchObject({ fileName: 'laudo.pdf', mimeType: 'application/pdf', sizeBytes: 100 });
    const [path, body, opts] = m.storage.upload.mock.calls[0]!;
    expect(path).toBe(result.storagePath);
    expect((body as ArrayBuffer).byteLength).toBe(100);
    expect(opts).toEqual({ contentType: 'application/pdf', upsert: false });
  });

  it('upload deriva a extensão do tipo (jpeg → jpg) e usa o tamanho real dos bytes', async () => {
    mockFile(2048);
    const m = createMockClient();

    const result = await createSupabaseAttachmentStorage(m.client).upload({
      familyId: 'f1',
      recordId: 'r1',
      file: { uri: 'file:///x', fileName: 'IMG_0001.JPEG', mimeType: 'image/jpeg', sizeBytes: 1 },
    });

    expect(result.storagePath).toMatch(/^f1\/r1\/[^/]+\.jpg$/);
    expect(result.sizeBytes).toBe(2048);
  });

  it('upload recusa tipo não aceito e arquivo grande sem tocar na rede', async () => {
    const m = createMockClient();
    const storage = createSupabaseAttachmentStorage(m.client);

    await expect(
      storage.upload({ familyId: 'f1', recordId: 'r1', file: { ...local, mimeType: 'application/zip' } }),
    ).rejects.toMatchObject({ code: 'attachment/invalid-type' });

    mockFile(21 * 1024 * 1024); // o seletor disse 100 bytes, mas o arquivo real passa de 20 MB
    await expect(storage.upload({ familyId: 'f1', recordId: 'r1', file: local })).rejects.toMatchObject({
      code: 'attachment/too-large',
    });
    expect(m.storage.upload).not.toHaveBeenCalled();
  });

  it('upload traduz falha de leitura e de envio', async () => {
    const m = createMockClient();
    const storage = createSupabaseAttachmentStorage(m.client);

    mockFile(0, true);
    await expect(storage.upload({ familyId: 'f1', recordId: 'r1', file: local })).rejects.toMatchObject({ code: 'attachment/read-failed' });

    mockFile(100);
    m.storage.upload.mockResolvedValueOnce(fail({ message: 'new row violates row-level security policy' }));
    await expect(storage.upload({ familyId: 'f1', recordId: 'r1', file: local })).rejects.toMatchObject({ code: 'attachment/upload-failed' });
  });

  it('getViewUrl usa 300 s por padrão e aceita outro prazo', async () => {
    const m = createMockClient();
    const storage = createSupabaseAttachmentStorage(m.client);

    expect(await storage.getViewUrl('f1/r1/a1.pdf')).toBe('https://signed');
    expect(m.storage.createSignedUrl).toHaveBeenLastCalledWith('f1/r1/a1.pdf', 300);
    await storage.getViewUrl('f1/r1/a1.pdf', 60);
    expect(m.storage.createSignedUrl).toHaveBeenLastCalledWith('f1/r1/a1.pdf', 60);
  });

  it('getViewUrl falha com DomainError quando o Storage nega', async () => {
    const m = createMockClient();
    m.storage.createSignedUrl.mockResolvedValueOnce(fail({ message: 'Object not found' }));
    await expect(createSupabaseAttachmentStorage(m.client).getViewUrl('f2/x/y.pdf')).rejects.toMatchObject({ code: 'attachment/url-failed' });
  });

  it('remove apaga em lotes de 100 e ignora lista vazia', async () => {
    const m = createMockClient();
    const storage = createSupabaseAttachmentStorage(m.client);
    await storage.remove([]);
    expect(m.storage.remove).not.toHaveBeenCalled();

    await storage.remove(Array.from({ length: 250 }, (_, i) => `f1/r1/${i}.pdf`));
    expect(m.storage.remove).toHaveBeenCalledTimes(3);
    expect(m.storage.remove.mock.calls.map((c) => c[0].length)).toEqual([100, 100, 50]);
  });
});
