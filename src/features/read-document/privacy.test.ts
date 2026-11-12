// Privacidade da leitura (spec P3, F1.15; ocr-tecnico.md §g): nenhum console.* no fluxo e no código das pastas do OCR.
import type { LocalFile } from '@/entities/health-record';
import { createNativeDocumentTextExtractor } from './data/native-document-text-extractor';
import * as F from './domain/__fixtures__/documents';
import { parseHealthDocument } from './domain/parse-health-document';
import { readDocument } from './domain/read-document';

// Sem @types/node no projeto: tipos mínimos do que o teste usa.
declare const __dirname: string;
const { readFileSync, readdirSync, statSync } = jest.requireActual<{
  readFileSync(path: string, encoding: 'utf8'): string;
  readdirSync(path: string): string[];
  statSync(path: string): { isDirectory(): boolean };
}>('fs');
const { join } = jest.requireActual<{ join(...parts: string[]): string }>('path');

const ROOT = join(__dirname, '..', '..', '..');
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name: string) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
const file: LocalFile = { uri: 'file:///cache/laudo.pdf', fileName: 'laudo.pdf', mimeType: 'application/pdf', sizeBytes: 10 };

describe('privacidade do OCR', () => {
  const methods = ['log', 'info', 'warn', 'error', 'debug', 'trace'] as const;
  let spies: jest.SpyInstance[] = [];
  beforeEach(() => {
    spies = methods.map((m) => jest.spyOn(console, m).mockImplementation(() => undefined));
  });
  afterEach(() => spies.forEach((s) => s.mockRestore()));

  it('leitura, parse e falha não chamam console.*', async () => {
    for (const text of Object.values(F)) parseHealthDocument(text, { today: '2026-11-11' });
    const ok = createNativeDocumentTextExtractor({
      extractText: async () => ({ engine: 'mlkit-latin', pageCount: 1, truncated: false, pages: [{ index: 0, text: F.HEMOGRAMA_HORIZONTE, source: 'ocr' }] }),
      cancel: () => undefined,
    });
    await readDocument({ extractor: ok }, [file], { today: '2026-11-11', member: { firstName: 'Ana', birthDate: null } });
    const failing = createNativeDocumentTextExtractor({
      extractText: async () => Promise.reject(Object.assign(new Error(F.HEMOGRAMA_HORIZONTE), { code: 'ERR_DOCUMENT_TEXT_OCR_FAILED' })),
      cancel: () => undefined,
    });
    await expect(readDocument({ extractor: failing }, [file], { today: '2026-11-11', member: { firstName: 'Ana', birthDate: null } })).rejects.toMatchObject({
      code: 'ocr/failed',
    });
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it('o código das pastas do OCR não tem console.* nem log nativo', () => {
    const sources = [...files(join(ROOT, 'src', 'features', 'read-document')), ...files(join(ROOT, 'modules', 'document-text'))].filter(
      (p) => /\.(ts|tsx|swift|kt)$/.test(p) && !/\.test\.tsx?$/.test(p),
    );
    expect(sources.length).toBeGreaterThan(10);
    const offenders = sources.filter((p) => /\bconsole\.|\bNSLog\(|\bprint\(|\bLog\.[dewiv]\(|\bos_log\(/.test(readFileSync(p, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
