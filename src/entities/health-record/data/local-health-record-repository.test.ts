import { createMemoryDb } from '@/shared/lib/testing';
import type { LocalDb } from '@/shared/lib';
import type { HealthRecordRepository, NewHealthRecord } from '../domain/health-record';
import { createLocalHealthRecordRepository } from './local-health-record-repository';

const base = (over: Partial<NewHealthRecord> = {}): NewHealthRecord => ({
  familyId: 'f1',
  memberId: 'm1',
  type: 'exam',
  title: 'Hemograma completo',
  date: '2026-10-01',
  location: 'Laboratório Central',
  professional: null,
  notes: null,
  ...over,
});

describe('createLocalHealthRecordRepository', () => {
  let db: LocalDb;
  let repo: HealthRecordRepository;
  beforeEach(() => {
    db = createMemoryDb();
    repo = createLocalHealthRecordRepository(db);
  });

  it('cria com id, datas e lista de anexos vazia', async () => {
    const r = await repo.create(base());
    expect(r).toMatchObject({ familyId: 'f1', title: 'Hemograma completo', attachments: [] });
    expect(r.id).toBeTruthy();
    expect(await repo.getById(r.id)).toEqual(r);
    expect(await repo.getById('nada')).toBeNull();
  });

  it('lista só a família pedida, ordenada por data desc', async () => {
    await repo.create(base({ title: 'Antigo', date: '2026-01-01' }));
    await repo.create(base({ title: 'Novo', date: '2026-09-01' }));
    await repo.create(base({ familyId: 'f2', title: 'De outra família' }));
    expect((await repo.list('f1')).map((r) => r.title)).toEqual(['Novo', 'Antigo']);
  });

  it('filtra por membro e por tipos', async () => {
    await repo.create(base({ title: 'A', memberId: 'm1', type: 'exam' }));
    await repo.create(base({ title: 'B', memberId: 'm2', type: 'exam' }));
    await repo.create(base({ title: 'C', memberId: 'm1', type: 'vaccine' }));
    expect((await repo.list('f1', { memberId: 'm1' })).map((r) => r.title).sort()).toEqual(['A', 'C']);
    expect((await repo.list('f1', { memberId: 'm1', types: ['vaccine'] })).map((r) => r.title)).toEqual(['C']);
  });

  it('busca texto ignorando acentos/caixa em título, local, profissional e notas, exigindo todas as palavras', async () => {
    await repo.create(base({ title: 'Ressonância do joelho', location: 'Clínica São José', professional: 'Dra. Íris Lima', notes: 'Sem lesão' }));
    await repo.create(base({ title: 'Consulta', location: 'Posto' }));
    expect(await repo.list('f1', { text: 'RESSONANCIA' })).toHaveLength(1);
    expect(await repo.list('f1', { text: 'sao jose' })).toHaveLength(1);
    expect(await repo.list('f1', { text: 'iris' })).toHaveLength(1);
    expect(await repo.list('f1', { text: 'lesao joelho' })).toHaveLength(1);
    expect(await repo.list('f1', { text: 'joelho cardiologia' })).toHaveLength(0);
  });

  it('adiciona anexos acumulando metadados e atualiza updatedAt', async () => {
    const r = await repo.create(base());
    const att = await repo.addAttachment(r.id, { id: 'a1', storagePath: 'f1/x/a1.pdf', fileName: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 10 });
    await repo.addAttachment(r.id, { id: 'a2', storagePath: 'f1/x/a2.pdf', fileName: 'b.pdf', mimeType: 'application/pdf', sizeBytes: 10 });
    expect(att).toMatchObject({ id: 'a1', recordId: r.id });
    const saved = await repo.getById(r.id);
    expect(saved?.attachments.map((a) => a.id)).toEqual(['a1', 'a2']);
  });

  it('adicionar anexo a registro inexistente falha com DomainError', async () => {
    await expect(
      repo.addAttachment('nada', { id: 'a', storagePath: 'p', fileName: 'a', mimeType: 'application/pdf', sizeBytes: 1 }),
    ).rejects.toMatchObject({ code: 'record/not-found' });
  });

  it('remove o registro; remover inexistente é idempotente', async () => {
    const r = await repo.create(base());
    await repo.remove(r.id);
    await repo.remove(r.id);
    expect(await repo.getById(r.id)).toBeNull();
  });
});
