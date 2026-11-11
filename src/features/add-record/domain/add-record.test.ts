import type {
  Attachment,
  AttachmentStorage,
  HealthRecord,
  HealthRecordRepository,
  LocalFile,
} from '@/entities/health-record';
import { addRecord, validateNewRecord, type AddRecordInput } from './add-record';

const now = new Date(2026, 10, 11);

const input = (over: Partial<AddRecordInput> = {}): AddRecordInput => ({
  familyId: 'f1',
  memberId: 'm1',
  type: 'exam',
  title: 'Hemograma',
  date: '2026-11-01',
  files: [],
  ...over,
});

const pdf = (name: string, over: Partial<LocalFile> = {}): LocalFile => ({
  uri: `file:///cache/${name}`,
  fileName: name,
  mimeType: 'application/pdf',
  sizeBytes: 1000,
  ...over,
});

function fakes(opts: { failUploadAt?: number; failMetadataAt?: number; failRemoveStorage?: boolean } = {}) {
  const records = new Map<string, HealthRecord>();
  const files = new Set<string>();
  let uploads = 0;
  let metas = 0;
  const repo: HealthRecordRepository = {
    list: async () => [...records.values()],
    getById: async (id) => records.get(id) ?? null,
    create: async (i) => {
      const r: HealthRecord = { ...i, id: 'r1', attachments: [], createdAt: 'c', updatedAt: 'c' };
      records.set(r.id, r);
      return r;
    },
    remove: async (id) => {
      records.delete(id);
    },
    addAttachment: async (recordId, a) => {
      metas += 1;
      if (metas === opts.failMetadataAt) throw new Error('db fora do ar');
      const att: Attachment = { ...a, recordId, createdAt: 'c' };
      records.get(recordId)!.attachments.push(att);
      return att;
    },
  };
  const storage: AttachmentStorage = {
    upload: async ({ familyId, recordId, file }) => {
      uploads += 1;
      if (uploads === opts.failUploadAt) throw new Error('rede caiu');
      const path = `${familyId}/${recordId}/a${uploads}.pdf`;
      files.add(path);
      return { id: `a${uploads}`, storagePath: path, fileName: file.fileName, mimeType: file.mimeType, sizeBytes: file.sizeBytes };
    },
    getViewUrl: async (p) => `signed://${p}`,
    remove: async (paths) => {
      if (opts.failRemoveStorage) throw new Error('storage fora do ar');
      paths.forEach((p) => files.delete(p));
    },
  };
  return { repo, storage, records, files };
}

describe('validateNewRecord', () => {
  it('normaliza título e transforma opcionais vazios em null', () => {
    const r = validateNewRecord(input({ title: '  Hemograma   completo ', location: '  ', professional: ' Dra. Ana ', notes: undefined }), now);
    expect(r).toMatchObject({ title: 'Hemograma completo', location: null, professional: 'Dra. Ana', notes: null });
  });

  it.each([
    ['familyId', { familyId: '' }, 'record/missing-family'],
    ['membro', { memberId: '' }, 'record/missing-member'],
    ['tipo', { type: 'outro' as never }, 'record/invalid-type'],
    ['título vazio', { title: '   ' }, 'record/missing-title'],
    ['título longo', { title: 'x'.repeat(121) }, 'record/title-too-long'],
    ['data inexistente', { date: '2026-02-30' }, 'record/invalid-date'],
    ['data antiga demais', { date: '1899-12-31' }, 'record/invalid-date'],
    ['data futura', { date: '2026-11-12' }, 'record/future-date'],
    ['observações longas', { notes: 'x'.repeat(2001) }, 'record/field-too-long'],
  ])('recusa %s', (_, over, code) => {
    expect(() => validateNewRecord(input(over), now)).toThrow(expect.objectContaining({ code }));
  });

  it('aceita a data de hoje', () => {
    expect(validateNewRecord(input({ date: '2026-11-11' }), now).date).toBe('2026-11-11');
  });
});

describe('addRecord', () => {
  it('cria o registro sem anexos', async () => {
    const f = fakes();
    const record = await addRecord({ records: f.repo, storage: f.storage }, input(), now);
    expect(record).toMatchObject({ id: 'r1', title: 'Hemograma', attachments: [] });
    expect(f.records.size).toBe(1);
  });

  it('envia cada anexo e registra os metadados, devolvendo o registro completo', async () => {
    const f = fakes();
    const record = await addRecord({ records: f.repo, storage: f.storage }, input({ files: [pdf('a.pdf'), pdf('b.pdf')] }), now);
    expect(record.attachments.map((a) => a.fileName)).toEqual(['a.pdf', 'b.pdf']);
    expect(record.attachments[0]?.storagePath).toBe('f1/r1/a1.pdf');
    expect(f.files.size).toBe(2);
    expect(f.records.get('r1')?.attachments).toHaveLength(2);
  });

  it('valida anexos ANTES de criar qualquer coisa', async () => {
    const f = fakes();
    await expect(
      addRecord({ records: f.repo, storage: f.storage }, input({ files: [pdf('ok.pdf'), pdf('grande.pdf', { sizeBytes: 21 * 1024 * 1024 })] }), now),
    ).rejects.toMatchObject({ code: 'attachment/too-large' });
    expect(f.records.size).toBe(0);
    expect(f.files.size).toBe(0);
  });

  it('dados inválidos não criam nada', async () => {
    const f = fakes();
    await expect(addRecord({ records: f.repo, storage: f.storage }, input({ date: '2999-01-01' }), now)).rejects.toMatchObject({ code: 'record/future-date' });
    expect(f.records.size).toBe(0);
  });

  it('se o 2º upload falha, apaga o 1º arquivo e o registro, e informa qual anexo falhou', async () => {
    const f = fakes({ failUploadAt: 2 });
    const run = addRecord({ records: f.repo, storage: f.storage }, input({ files: [pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf')] }), now);
    await expect(run).rejects.toMatchObject({ code: 'record/upload-failed', message: expect.stringContaining('"b.pdf"') });
    expect(f.files.size).toBe(0);
    expect(f.records.size).toBe(0);
  });

  it('se o registro do metadado falha, apaga também o arquivo que acabou de subir', async () => {
    const f = fakes({ failMetadataAt: 2 });
    await expect(
      addRecord({ records: f.repo, storage: f.storage }, input({ files: [pdf('a.pdf'), pdf('b.pdf')] }), now),
    ).rejects.toMatchObject({ code: 'record/upload-failed' });
    expect(f.files.size).toBe(0);
    expect(f.records.size).toBe(0);
  });

  it('a falha original é a informada mesmo se a limpeza também falhar, e preserva a causa', async () => {
    const f = fakes({ failUploadAt: 2, failRemoveStorage: true });
    const error = await addRecord({ records: f.repo, storage: f.storage }, input({ files: [pdf('a.pdf'), pdf('b.pdf')] }), now).catch((e) => e);
    expect(error).toMatchObject({ code: 'record/upload-failed' });
    expect((error as Error).cause).toEqual(new Error('rede caiu'));
    expect(f.records.size).toBe(0);
  });

  it('se o primeiro upload falha, não tenta apagar arquivos (nenhum subiu)', async () => {
    const f = fakes({ failUploadAt: 1 });
    const removeSpy = jest.spyOn(f.storage, 'remove');
    await expect(addRecord({ records: f.repo, storage: f.storage }, input({ files: [pdf('a.pdf')] }), now)).rejects.toMatchObject({ code: 'record/upload-failed' });
    expect(removeSpy).not.toHaveBeenCalled();
    expect(f.records.size).toBe(0);
  });
});
