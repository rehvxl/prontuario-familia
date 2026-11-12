import { LOCAL_COLLECTIONS } from '@/shared/lib';
import { createMemoryDb } from '@/shared/lib/testing';
import {
  createLocalHealthRecordRepository,
  type Attachment,
  type AttachmentStorage,
  type HealthRecord,
  type HealthRecordRepository,
  type LocalFile,
} from '@/entities/health-record';
import { createLocalMeasurementRepository, type MeasurementRepository } from '@/entities/measurement';
import { createLocalMedicationRepository, type MedicationRepository } from '@/entities/medication';
import { createLocalVaccineDoseRepository, type VaccineDoseRepository } from '@/entities/vaccine';
import { addRecord, validateNewRecord, type AddRecordInput, type HealthDataInput } from './add-record';

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

/** Portas de saúde que não devem ser chamadas (casos sem `healthData`). */
const untouched = () => {
  const fail = jest.fn(async () => {
    throw new Error('não deveria gravar itens de saúde');
  });
  return {
    measurements: { createMany: fail } as unknown as MeasurementRepository,
    vaccineDoses: { createMany: fail } as unknown as VaccineDoseRepository,
    medications: { createMany: fail } as unknown as MedicationRepository,
    fail,
  };
};

const deps = (f: ReturnType<typeof fakes>) => ({ records: f.repo, storage: f.storage, ...untouched() });

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
    const record = await addRecord(deps(f), input(), now);
    expect(record).toMatchObject({ id: 'r1', title: 'Hemograma', attachments: [] });
    expect(f.records.size).toBe(1);
  });

  it('envia cada anexo e registra os metadados, devolvendo o registro completo', async () => {
    const f = fakes();
    const record = await addRecord(deps(f), input({ files: [pdf('a.pdf'), pdf('b.pdf')] }), now);
    expect(record.attachments.map((a) => a.fileName)).toEqual(['a.pdf', 'b.pdf']);
    expect(record.attachments[0]?.storagePath).toBe('f1/r1/a1.pdf');
    expect(f.files.size).toBe(2);
    expect(f.records.get('r1')?.attachments).toHaveLength(2);
  });

  it('valida anexos ANTES de criar qualquer coisa', async () => {
    const f = fakes();
    await expect(
      addRecord(deps(f), input({ files: [pdf('ok.pdf'), pdf('grande.pdf', { sizeBytes: 21 * 1024 * 1024 })] }), now),
    ).rejects.toMatchObject({ code: 'attachment/too-large' });
    expect(f.records.size).toBe(0);
    expect(f.files.size).toBe(0);
  });

  it('dados inválidos não criam nada', async () => {
    const f = fakes();
    await expect(addRecord(deps(f), input({ date: '2999-01-01' }), now)).rejects.toMatchObject({ code: 'record/future-date' });
    expect(f.records.size).toBe(0);
  });

  it('se o 2º upload falha, apaga o 1º arquivo e o registro, e informa qual anexo falhou', async () => {
    const f = fakes({ failUploadAt: 2 });
    const run = addRecord(deps(f), input({ files: [pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf')] }), now);
    await expect(run).rejects.toMatchObject({ code: 'record/upload-failed', message: expect.stringContaining('"b.pdf"') });
    expect(f.files.size).toBe(0);
    expect(f.records.size).toBe(0);
  });

  it('se o registro do metadado falha, apaga também o arquivo que acabou de subir', async () => {
    const f = fakes({ failMetadataAt: 2 });
    await expect(
      addRecord(deps(f), input({ files: [pdf('a.pdf'), pdf('b.pdf')] }), now),
    ).rejects.toMatchObject({ code: 'record/upload-failed' });
    expect(f.files.size).toBe(0);
    expect(f.records.size).toBe(0);
  });

  it('a falha original é a informada mesmo se a limpeza também falhar, e preserva a causa', async () => {
    const f = fakes({ failUploadAt: 2, failRemoveStorage: true });
    const error = await addRecord(deps(f), input({ files: [pdf('a.pdf'), pdf('b.pdf')] }), now).catch((e) => e);
    expect(error).toMatchObject({ code: 'record/upload-failed' });
    expect((error as Error).cause).toEqual(new Error('rede caiu'));
    expect(f.records.size).toBe(0);
  });

  it('se o primeiro upload falha, não tenta apagar arquivos (nenhum subiu)', async () => {
    const f = fakes({ failUploadAt: 1 });
    const removeSpy = jest.spyOn(f.storage, 'remove');
    await expect(addRecord(deps(f), input({ files: [pdf('a.pdf')] }), now)).rejects.toMatchObject({ code: 'record/upload-failed' });
    expect(removeSpy).not.toHaveBeenCalled();
    expect(f.records.size).toBe(0);
  });
});

describe('addRecord com healthData (itens confirmados na revisão do OCR)', () => {
  const healthData = (over: Partial<HealthDataInput> = {}): HealthDataInput => ({
    measurements: [
      {
        kind: 'lab', code: 'hba1c', label: 'Hemoglobina glicada (HbA1c)', value: 7.4, value2: null, unit: '%',
        referenceLow: 4, referenceHigh: 5.6, referenceText: null, takenOn: '2026-11-01', takenAt: null, context: null, note: null,
      },
    ],
    vaccineDoses: [
      { vaccineCode: 'influenza', vaccineName: null, doseKey: 'ANUAL', doseLabel: 'Anual', appliedOn: '2026-04-15', lot: 'FLU26A0412', location: null },
    ],
    medications: [
      { name: 'Amoxicilina', dosage: '500 mg', instructions: 'Tomar 1 cápsula de 8 em 8 horas por 7 dias.', startOn: '2026-11-01', endOn: '2026-11-07' },
    ],
    ...over,
  });

  /** Modo demo de verdade: as portas locais conferem pessoa e documento, e o registro apaga os itens em cascata. */
  async function local() {
    const db = createMemoryDb();
    await db.put(LOCAL_COLLECTIONS.members, 'm1', { id: 'm1', familyId: 'f1', fullName: 'Carlos Souza' });
    const f = fakes();
    const ports = {
      records: createLocalHealthRecordRepository(db),
      storage: f.storage,
      measurements: createLocalMeasurementRepository(db),
      vaccineDoses: createLocalVaccineDoseRepository(db),
      medications: createLocalMedicationRepository(db),
    };
    return { db, files: f.files, ports };
  }

  it('grava o registro e cada item com sourceRecordId do registro, origin ocr e a pessoa e família do formulário', async () => {
    const { ports } = await local();
    const record = await addRecord(ports, input({ healthData: healthData() }), now);

    const [measurements, doses, medications] = await Promise.all([
      ports.measurements.listBySourceRecord(record.id),
      ports.vaccineDoses.listBySourceRecord(record.id),
      ports.medications.listBySourceRecord(record.id),
    ]);
    const link = { familyId: 'f1', memberId: 'm1', sourceRecordId: record.id, origin: 'ocr' };
    expect(measurements).toEqual([expect.objectContaining({ ...link, code: 'hba1c', value: 7.4 })]);
    expect(doses).toEqual([expect.objectContaining({ ...link, vaccineCode: 'influenza', lot: 'FLU26A0412' })]);
    expect(medications).toEqual([expect.objectContaining({ ...link, name: 'Amoxicilina', endOn: '2026-11-07' })]);
  });

  it('listas vazias não chamam createMany', async () => {
    const f = fakes();
    const health = untouched();
    const empty = { measurements: [], vaccineDoses: [], medications: [] };
    await addRecord({ records: f.repo, storage: f.storage, ...health }, input({ healthData: empty }), now);
    expect(health.fail).not.toHaveBeenCalled();
    expect(f.records.size).toBe(1);
  });

  it('sem healthData, o comportamento é o do MVP: nenhuma porta de saúde é chamada', async () => {
    const f = fakes();
    const health = untouched();
    const record = await addRecord({ records: f.repo, storage: f.storage, ...health }, input({ files: [pdf('a.pdf')] }), now);
    expect(record.attachments).toHaveLength(1);
    expect(health.fail).not.toHaveBeenCalled();
  });

  it('se as doses falham depois das medições, apaga anexos e registro, e a cascata leva as medições já gravadas', async () => {
    const { db, files, ports } = await local();
    // 'other' sem nome é recusado pela porta, como o check do banco.
    const badDose = { ...healthData().vaccineDoses[0]!, vaccineCode: 'other', vaccineName: null };
    const error = await addRecord(ports, input({ files: [pdf('a.pdf')], healthData: healthData({ vaccineDoses: [badDose] }) }), now).catch((e) => e);

    expect(error).toMatchObject({
      code: 'record/health-data-failed',
      message: 'Não foi possível salvar os dados lidos. O registro não foi salvo; tente novamente.',
    });
    expect((error as Error).cause).toMatchObject({ code: 'vaccine/invalid-dose' });
    expect(await db.list(LOCAL_COLLECTIONS.records)).toEqual([]);
    expect(await db.list(LOCAL_COLLECTIONS.measurements)).toEqual([]);
    expect(await db.list(LOCAL_COLLECTIONS.vaccineDoses)).toEqual([]);
    expect(await db.list(LOCAL_COLLECTIONS.medications)).toEqual([]);
    expect(files.size).toBe(0);
  });

  it('falha nos medicamentos também desfaz tudo e informa record/health-data-failed', async () => {
    const { db, ports } = await local();
    const endBeforeStart = { ...healthData().medications[0]!, endOn: '2026-10-01' };
    await expect(addRecord(ports, input({ healthData: healthData({ medications: [endBeforeStart] }) }), now)).rejects.toMatchObject({
      code: 'record/health-data-failed',
    });
    expect(await db.list(LOCAL_COLLECTIONS.records)).toEqual([]);
    expect(await db.list(LOCAL_COLLECTIONS.measurements)).toEqual([]);
    expect(await db.list(LOCAL_COLLECTIONS.vaccineDoses)).toEqual([]);
  });

  it('falha de envio de anexo continua record/upload-failed e não chega a gravar itens', async () => {
    const f = fakes({ failUploadAt: 1 });
    const health = untouched();
    await expect(
      addRecord({ records: f.repo, storage: f.storage, ...health }, input({ files: [pdf('a.pdf')], healthData: healthData() }), now),
    ).rejects.toMatchObject({ code: 'record/upload-failed' });
    expect(health.fail).not.toHaveBeenCalled();
    expect(f.records.size).toBe(0);
  });
});
