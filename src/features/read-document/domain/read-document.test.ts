import type { LocalFile } from '@/entities/health-record';
import { DomainError } from '@/shared/lib';
import * as F from './__fixtures__/documents';
import type { DocumentTextExtractor, ExtractedText } from './document-text';
import { READ_DOCUMENT_MAX_PAGES, READ_DOCUMENT_TIMEOUT_MS, isPatientNameMismatch, readDocument } from './read-document';

const file = (fileName = 'laudo.pdf', mimeType = 'application/pdf'): LocalFile => ({ uri: `file:///cache/${fileName}`, fileName, mimeType, sizeBytes: 1000 });
const text = (pages: string[], truncated = false): ExtractedText => ({
  engine: 'apple-vision',
  pageCount: pages.length,
  truncated,
  pages: pages.map((t, index) => ({ index, text: t, source: 'pdf-text' })),
});
const extractor = (extract: DocumentTextExtractor['extract']): DocumentTextExtractor => ({ availability: 'device', extract: jest.fn(extract) });
const options = (over: Partial<Parameters<typeof readDocument>[2]> = {}) => ({
  today: '2026-11-11',
  member: { firstName: 'Ana', birthDate: '1988-02-14' },
  ...over,
});

describe('readDocument', () => {
  afterEach(() => jest.useRealTimers());

  it('sem leitor (Expo Go/web) devolve null', async () => {
    const unavailable: DocumentTextExtractor = { availability: 'unavailable', extract: jest.fn() };
    await expect(readDocument({ extractor: unavailable }, [file()], options())).resolves.toBeNull();
    expect(unavailable.extract).not.toHaveBeenCalled();
  });

  it('extrator que devolve null também dá null', async () => {
    await expect(readDocument({ extractor: extractor(async () => null) }, [file()], options())).resolves.toBeNull();
  });

  it('sem arquivos: ocr/no-files', async () => {
    await expect(readDocument({ extractor: extractor(async () => text(['x'])) }, [], options())).rejects.toMatchObject({ code: 'ocr/no-files' });
  });

  it('tipo de anexo inválido: erro do anexo, sem ler', async () => {
    const ex = extractor(async () => text(['x']));
    await expect(readDocument({ extractor: ex }, [file('nota.txt', 'text/plain')], options())).rejects.toMatchObject({ code: 'attachment/invalid-type' });
    expect(ex.extract).not.toHaveBeenCalled();
  });

  it('junta páginas e arquivos, repassa o progresso e não devolve o texto', async () => {
    const half = F.HEMOGRAMA_HORIZONTE.split('PLAQUETOGRAMA');
    const ex = extractor(async (f) => (f.fileName === 'a.pdf' ? text([half[0]!]) : text([`PLAQUETOGRAMA${half[1]!}`])));
    const onProgress = jest.fn();
    const r = await readDocument({ extractor: ex }, [file('a.pdf'), file('b.jpg', 'image/jpeg')], options({ onProgress }));
    expect(onProgress.mock.calls).toEqual([[{ current: 1, total: 2 }], [{ current: 2, total: 2 }]]);
    expect(r).toMatchObject({ engine: 'apple-vision', truncated: false, filesRead: 2, patientNameMismatch: false });
    expect(r?.suggestions.labResults.map((l) => l.code)).toContain('platelets');
    expect(JSON.stringify(Object.keys(r!))).not.toContain('text');
  });

  it('passa o saldo de páginas e corta em 5 no total (truncated)', async () => {
    const ex = extractor(async (_f, o) => text(Array.from({ length: Math.min(3, o?.maxPages ?? 99) }, () => 'pagina'), (o?.maxPages ?? 99) < 3));
    const r = await readDocument({ extractor: ex }, [file('1.pdf'), file('2.pdf'), file('3.pdf')], options());
    const calls = (ex.extract as jest.Mock).mock.calls.map((c) => c[1].maxPages);
    expect(calls).toEqual([READ_DOCUMENT_MAX_PAGES, 2]);
    expect(r).toMatchObject({ truncated: true, filesRead: 2 });
  });

  it('corta páginas a mais mesmo se o extrator ignorar maxPages', async () => {
    const ex = extractor(async () => text(['1', '2', '3', '4', '5', '6', '7']));
    const r = await readDocument({ extractor: ex }, [file()], options());
    expect(r?.truncated).toBe(true);
  });

  it('lê no máximo 5 arquivos', async () => {
    const ex = extractor(async () => text(['p']));
    const files = Array.from({ length: 7 }, (_, i) => file(`${i}.jpg`, 'image/jpeg'));
    const r = await readDocument({ extractor: ex }, files, options());
    expect(ex.extract).toHaveBeenCalledTimes(5);
    expect(r).toMatchObject({ filesRead: 5, truncated: true });
  });

  it('20 s no total: aborta o sinal do extrator e rejeita ocr/timeout', async () => {
    jest.useFakeTimers();
    let signal: AbortSignal | undefined;
    const ex = extractor((_f, o) => {
      signal = o?.signal;
      return new Promise(() => undefined); // extrator que nunca responde
    });
    const promise = readDocument({ extractor: ex }, [file()], options());
    jest.advanceTimersByTime(READ_DOCUMENT_TIMEOUT_MS - 1);
    expect(signal?.aborted).toBe(false);
    jest.advanceTimersByTime(1);
    await expect(promise).rejects.toMatchObject({ code: 'ocr/timeout' });
    expect(signal?.aborted).toBe(true);
  });

  it('timeout vence o ocr/cancelled que o extrator devolve ao ser abortado', async () => {
    jest.useFakeTimers();
    const ex = extractor(
      (_f, o) => new Promise((_, reject) => o?.signal?.addEventListener('abort', () => reject(new DomainError('ocr/cancelled', 'Leitura cancelada.')))),
    );
    const promise = readDocument({ extractor: ex }, [file()], options());
    jest.advanceTimersByTime(READ_DOCUMENT_TIMEOUT_MS);
    await expect(promise).rejects.toMatchObject({ code: 'ocr/timeout' });
  });

  it('cancelamento de quem chamou rejeita ocr/cancelled', async () => {
    const controller = new AbortController();
    const ex = extractor(() => new Promise(() => undefined));
    const promise = readDocument({ extractor: ex }, [file()], options({ signal: controller.signal }));
    controller.abort();
    await expect(promise).rejects.toMatchObject({ code: 'ocr/cancelled' });
  });

  it('sinal já abortado não chama o extrator', async () => {
    const controller = new AbortController();
    controller.abort();
    const ex = extractor(async () => text(['x']));
    await expect(readDocument({ extractor: ex }, [file()], options({ signal: controller.signal }))).rejects.toMatchObject({ code: 'ocr/cancelled' });
    expect(ex.extract).not.toHaveBeenCalled();
  });

  it('F1.6: descarta a data anterior ao nascimento e avisa', async () => {
    const ex = extractor(async () => text(['Data da coleta: 10/01/2020\nHemoglobina: 12,0 g/dL']));
    const r = await readDocument({ extractor: ex }, [file()], options({ member: { firstName: 'Lia', birthDate: '2026-01-05' } }));
    expect(r?.suggestions.date).toBeNull();
    expect(r?.suggestions.warnings.map((w) => w.code)).toContain('date-before-birth');
  });

  it('F1.6: no dia do nascimento a data continua', async () => {
    const ex = extractor(async () => text(['Data da coleta: 05/01/2026']));
    const r = await readDocument({ extractor: ex }, [file()], options({ member: { firstName: 'Lia', birthDate: '2026-01-05' } }));
    expect(r?.suggestions.date?.value).toBe('2026-01-05');
  });

  it('A11: nome lido de outra pessoa marca patientNameMismatch', async () => {
    const ex = extractor(async () => text([F.HEMOGRAMA_HORIZONTE]));
    const other = await readDocument({ extractor: ex }, [file()], options({ member: { firstName: 'Carlos', birthDate: null } }));
    const same = await readDocument({ extractor: ex }, [file()], options({ member: { firstName: 'ANA', birthDate: null } }));
    expect(other?.patientNameMismatch).toBe(true);
    expect(same?.patientNameMismatch).toBe(false);
  });
});

describe('isPatientNameMismatch', () => {
  it('compara sem acento e sem caixa', () => {
    expect(isPatientNameMismatch('JOSÉ CARLOS', 'Jose')).toBe(false);
    expect(isPatientNameMismatch('Maria José Santos', 'josé')).toBe(false);
    expect(isPatientNameMismatch('Dirce Moreira', 'Ana')).toBe(true);
  });

  it('não acusa sem nome lido ou sem primeiro nome', () => {
    expect(isPatientNameMismatch(null, 'Ana')).toBe(false);
    expect(isPatientNameMismatch('Dirce Moreira', '')).toBe(false);
  });

  it('não casa pedaço de palavra ("Ana" em "Mariana")', () => {
    expect(isPatientNameMismatch('Mariana Souza', 'Ana')).toBe(true);
  });
});
