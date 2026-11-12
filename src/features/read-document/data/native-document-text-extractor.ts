// Adaptadores nativo e indisponível (ocr-tecnico.md §b.3). O texto lido é dado de saúde: não logar nem persistir.
import { DomainError, newId } from '@/shared/lib';
import documentTextModule, { type DocumentTextNativeModule } from '../../../../modules/document-text/src/DocumentTextModule';
import type { DocumentTextExtractor } from '../domain/document-text';

export type { DocumentTextNativeModule };

// Guarda do adaptador. O limite da spec (20 s e 5 páginas no total) é aplicado por readDocument, que passa `signal` e `maxPages`.
export const OCR_TIMEOUT_MS = 20_000;
export const OCR_MAX_PAGES = 5;

const FAILED: readonly [string, string] = ['ocr/failed', 'Não foi possível ler o documento. Preencha os campos manualmente.'];

const MESSAGES: Readonly<Record<string, readonly [code: string, message: string]>> = {
  ERR_DOCUMENT_TEXT_FILE_NOT_FOUND: ['ocr/file-not-found', 'Não encontramos o arquivo. Anexe de novo e tente outra vez.'],
  ERR_DOCUMENT_TEXT_UNSUPPORTED_TYPE: ['ocr/unsupported-type', 'Este tipo de arquivo não pode ser lido. Preencha os campos manualmente.'],
  ERR_DOCUMENT_TEXT_TOO_LARGE: ['ocr/too-large', 'O arquivo passa de 20 MB.'],
  ERR_DOCUMENT_TEXT_PDF_LOCKED: ['ocr/pdf-locked', 'Este PDF está protegido por senha. Preencha os campos manualmente.'],
  ERR_DOCUMENT_TEXT_UNREADABLE: ['ocr/unreadable', 'Não conseguimos ler este arquivo. Preencha os campos manualmente.'],
  ERR_DOCUMENT_TEXT_CANCELLED: ['ocr/cancelled', 'Leitura cancelada.'],
};

const cancelled = () => new DomainError('ocr/cancelled', 'Leitura cancelada.');

/** Traduz o erro nativo pelo `code`; nunca repassa a mensagem nativa para a UI. */
function toDomainError(error: unknown): DomainError {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : '';
  const [domainCode, message] = MESSAGES[code] ?? FAILED;
  return new DomainError(domainCode, message, { cause: error });
}

export function createNativeDocumentTextExtractor(native: DocumentTextNativeModule, timeoutMs = OCR_TIMEOUT_MS): DocumentTextExtractor {
  return {
    availability: 'device',
    extract(file, { signal, maxPages = OCR_MAX_PAGES } = {}) {
      if (signal?.aborted) return Promise.reject(cancelled());
      const requestId = newId();
      return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (settle: () => void) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          signal?.removeEventListener('abort', onAbort);
          settle();
        };
        // O JS não espera o nativo terminar: avisa o cancelamento e libera a tela na hora.
        const stop = (error: DomainError) => {
          native.cancel(requestId);
          finish(() => reject(error));
        };
        const onAbort = () => stop(cancelled());
        const timer = setTimeout(
          () => stop(new DomainError('ocr/timeout', 'A leitura demorou demais. Preencha os campos manualmente ou tente uma foto mais nítida.')),
          timeoutMs,
        );
        signal?.addEventListener('abort', onAbort);
        native
          .extractText(file.uri, file.mimeType, { requestId, maxPages })
          .then((result) =>
            finish(() =>
              resolve({
                engine: result.engine,
                pageCount: result.pageCount,
                truncated: result.truncated,
                pages: result.pages.map((p) => ({ index: p.index, text: p.text, source: p.source })),
              }),
            ),
          )
          .catch((error: unknown) => finish(() => reject(toDomainError(error))));
      });
    },
  };
}

/** Leitor do aparelho, ou `null` quando o módulo nativo não está no binário (Expo Go, web). */
export function createDeviceDocumentTextExtractor(native: DocumentTextNativeModule | null = documentTextModule): DocumentTextExtractor | null {
  return native ? createNativeDocumentTextExtractor(native) : null;
}

export const unavailableDocumentTextExtractor: DocumentTextExtractor = {
  availability: 'unavailable',
  extract: async () => null,
};
