import type { LocalFile } from '@/entities/health-record';
import type { DocumentTextNativeModule } from '../../../../modules/document-text/src/DocumentTextModule';
import * as F from '../domain/__fixtures__/documents';
import { createDemoDocumentTextExtractor, demoTextFor } from './demo-document-text-extractor';
import {
  OCR_MAX_PAGES,
  createDeviceDocumentTextExtractor,
  createNativeDocumentTextExtractor,
  unavailableDocumentTextExtractor,
} from './native-document-text-extractor';

const file = (fileName = 'laudo.pdf'): LocalFile => ({ uri: 'file:///cache/laudo.pdf', fileName, mimeType: 'application/pdf', sizeBytes: 10 });
const RESULT = { engine: 'apple-vision' as const, pageCount: 2, truncated: false, pages: [{ index: 0, text: 'Hemoglobina 12', source: 'pdf-text' as const }] };

function fakeNative(extractText: DocumentTextNativeModule['extractText']): DocumentTextNativeModule & { cancel: jest.Mock; extractText: jest.Mock } {
  return { extractText: jest.fn(extractText), cancel: jest.fn() };
}

describe('adaptador nativo', () => {
  afterEach(() => jest.useRealTimers());

  it('mapeia o resultado e passa uri, tipo, requestId e maxPages', async () => {
    const native = fakeNative(async () => RESULT);
    const ex = createNativeDocumentTextExtractor(native);
    expect(ex.availability).toBe('device');
    await expect(ex.extract(file())).resolves.toEqual(RESULT);
    const [uri, mime, opts] = native.extractText.mock.calls[0]!;
    expect([uri, mime, opts.maxPages]).toEqual(['file:///cache/laudo.pdf', 'application/pdf', OCR_MAX_PAGES]);
    expect(typeof opts.requestId).toBe('string');
    await ex.extract(file(), { maxPages: 2 });
    expect(native.extractText.mock.calls[1]![2].maxPages).toBe(2);
  });

  it.each([
    ['ERR_DOCUMENT_TEXT_FILE_NOT_FOUND', 'ocr/file-not-found', 'Não encontramos o arquivo. Anexe de novo e tente outra vez.'],
    ['ERR_DOCUMENT_TEXT_UNSUPPORTED_TYPE', 'ocr/unsupported-type', 'Este tipo de arquivo não pode ser lido. Preencha os campos manualmente.'],
    ['ERR_DOCUMENT_TEXT_TOO_LARGE', 'ocr/too-large', 'O arquivo passa de 20 MB.'],
    ['ERR_DOCUMENT_TEXT_PDF_LOCKED', 'ocr/pdf-locked', 'Este PDF está protegido por senha. Preencha os campos manualmente.'],
    ['ERR_DOCUMENT_TEXT_UNREADABLE', 'ocr/unreadable', 'Não conseguimos ler este arquivo. Preencha os campos manualmente.'],
    ['ERR_DOCUMENT_TEXT_CANCELLED', 'ocr/cancelled', 'Leitura cancelada.'],
    ['ERR_DOCUMENT_TEXT_OCR_FAILED', 'ocr/failed', 'Não foi possível ler o documento. Preencha os campos manualmente.'],
    ['QUALQUER_OUTRO', 'ocr/failed', 'Não foi possível ler o documento. Preencha os campos manualmente.'],
  ])('%s → %s, sem repassar a mensagem nativa', async (nativeCode, code, message) => {
    const native = fakeNative(async () => Promise.reject(Object.assign(new Error('detalhe nativo Hemoglobina 12'), { code: nativeCode })));
    const error = await createNativeDocumentTextExtractor(native).extract(file()).catch((e: unknown) => e);
    expect(error).toMatchObject({ code, message });
    expect((error as Error).message).not.toContain('Hemoglobina');
  });

  it('timeout chama cancel(requestId) e rejeita ocr/timeout', async () => {
    jest.useFakeTimers();
    const native = fakeNative(() => new Promise(() => undefined));
    const promise = createNativeDocumentTextExtractor(native, 1000).extract(file());
    jest.advanceTimersByTime(1000);
    await expect(promise).rejects.toMatchObject({ code: 'ocr/timeout' });
    expect(native.cancel).toHaveBeenCalledWith(native.extractText.mock.calls[0]![2].requestId);
  });

  it('abort chama cancel e rejeita ocr/cancelled; resultado tardio é ignorado', async () => {
    let finish: (v: typeof RESULT) => void = () => undefined;
    const native = fakeNative(() => new Promise((resolve) => (finish = resolve)));
    const controller = new AbortController();
    const promise = createNativeDocumentTextExtractor(native).extract(file(), { signal: controller.signal });
    controller.abort();
    finish(RESULT);
    await expect(promise).rejects.toMatchObject({ code: 'ocr/cancelled' });
    expect(native.cancel).toHaveBeenCalledTimes(1);
  });

  it('sinal já abortado não chama o nativo', async () => {
    const native = fakeNative(async () => RESULT);
    const controller = new AbortController();
    controller.abort();
    await expect(createNativeDocumentTextExtractor(native).extract(file(), { signal: controller.signal })).rejects.toMatchObject({ code: 'ocr/cancelled' });
    expect(native.extractText).not.toHaveBeenCalled();
  });

  it('createDeviceDocumentTextExtractor: null sem módulo; nativo com módulo', () => {
    expect(createDeviceDocumentTextExtractor(null)).toBeNull();
    // no Jest o módulo nativo não está no binário: o padrão também é null
    expect(createDeviceDocumentTextExtractor()).toBeNull();
    expect(createDeviceDocumentTextExtractor(fakeNative(async () => RESULT))?.availability).toBe('device');
  });

  it('indisponível devolve null', async () => {
    expect(unavailableDocumentTextExtractor.availability).toBe('unavailable');
    await expect(unavailableDocumentTextExtractor.extract(file())).resolves.toBeNull();
  });
});

describe('adaptador demo (F1.12)', () => {
  afterEach(() => jest.useRealTimers());

  it.each([
    ['hemograma.pdf', F.HEMOGRAMA_HORIZONTE],
    ['foto-1.jpg', F.HEMOGRAMA_HORIZONTE],
    ['glicada-carlos.pdf', F.BIOQUIMICA_CERRADO],
    ['Receita.jpg', F.RECEITA_VIVER_BEM],
    ['carteira-vacina.png', F.VACINAS_IMUNIZAR],
  ])('%s → texto simulado certo', (name, expected) => {
    expect(demoTextFor(name)).toBe(expected);
  });

  it('espera e devolve uma página de texto demo', async () => {
    jest.useFakeTimers();
    const promise = createDemoDocumentTextExtractor(500).extract(file('receita.pdf'));
    jest.advanceTimersByTime(500);
    await expect(promise).resolves.toEqual({ engine: 'demo', pageCount: 1, truncated: false, pages: [{ index: 0, text: F.RECEITA_VIVER_BEM, source: 'demo' }] });
  });

  it('cancela durante a espera', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    const promise = createDemoDocumentTextExtractor(500).extract(file(), { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ code: 'ocr/cancelled' });
  });
});
