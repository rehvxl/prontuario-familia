// Caso de uso da leitura (ocr-tecnico.md §b.5, com o "Alinhamento com a spec"). Não salva nada e não devolve o texto.
import { validateAttachment, type LocalFile } from '@/entities/health-record';
import { DomainError } from '@/shared/lib';
import type { DocumentTextExtractor, ExtractedText } from './document-text';
import { fold, parseHealthDocument } from './parse-health-document';
import type { HealthDocumentSuggestions, ParseOptions } from './suggestions';

/** Limites da spec (F1.1 e F1.2): 5 arquivos, 5 páginas e 20 s no total da leitura. */
export const READ_DOCUMENT_MAX_FILES = 5;
export const READ_DOCUMENT_MAX_PAGES = 5;
export const READ_DOCUMENT_TIMEOUT_MS = 20_000;

export interface ReadDocumentResult {
  suggestions: HealthDocumentSuggestions;
  /** A11: o nome lido em "Paciente:" não contém o primeiro nome da pessoa escolhida. */
  patientNameMismatch: boolean;
  engine: ExtractedText['engine'];
  truncated: boolean;
  filesRead: number;
}

export interface ReadDocumentOptions extends ParseOptions {
  /** Pessoa escolhida no formulário: primeiro nome (A11) e nascimento (F1.6). */
  member: { firstName: string; birthDate: string | null };
  signal?: AbortSignal;
  onProgress?: (progress: { current: number; total: number }) => void;
}

const cancelledError = () => new DomainError('ocr/cancelled', 'Leitura cancelada.');
const timeoutError = () =>
  new DomainError('ocr/timeout', 'A leitura demorou demais. Preencha os campos manualmente ou tente uma foto mais nítida.');

const tokens = (s: string) => fold(s).split(/[^a-z]+/).filter((t) => t.length > 0);

/** F1.9: nenhum token do primeiro nome aparece no nome lido (sem acento e sem caixa). */
export function isPatientNameMismatch(patientName: string | null, firstName: string): boolean {
  if (patientName === null) return false;
  const wanted = tokens(firstName);
  if (wanted.length === 0) return false;
  const read = new Set(tokens(patientName));
  return !wanted.some((t) => read.has(t));
}

/**
 * Lê os anexos em sequência, junta o texto e gera sugestões. `null` quando não há leitor (Expo Go/web).
 * 5 páginas e 20 s no total: o saldo de páginas vai em `maxPages` e o estouro do tempo vira `ocr/timeout`.
 */
export async function readDocument(
  deps: { extractor: DocumentTextExtractor },
  files: LocalFile[],
  options: ReadDocumentOptions,
): Promise<ReadDocumentResult | null> {
  if (deps.extractor.availability === 'unavailable') return null;
  if (files.length === 0) throw new DomainError('ocr/no-files', 'Anexe um PDF ou uma foto do documento para ler.');
  const selected = files.slice(0, READ_DOCUMENT_MAX_FILES);
  selected.forEach(validateAttachment);
  if (options.signal?.aborted) throw cancelledError();

  // Um sinal só para o extrator: aborta no cancelamento de quem chamou ou no estouro dos 20 s.
  const controller = new AbortController();
  let timedOut = false;
  let rejectStop: (error: DomainError) => void = () => undefined;
  const stopped = new Promise<never>((_, reject) => {
    rejectStop = reject;
  });
  stopped.catch(() => undefined);
  const stop = (error: DomainError) => {
    controller.abort();
    rejectStop(error);
  };
  const onCallerAbort = () => stop(cancelledError());
  options.signal?.addEventListener('abort', onCallerAbort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    stop(timeoutError());
  }, READ_DOCUMENT_TIMEOUT_MS);

  try {
    const texts: string[] = [];
    let pagesLeft = READ_DOCUMENT_MAX_PAGES;
    let truncated = files.length > selected.length;
    let engine: ExtractedText['engine'] = 'demo';
    let filesRead = 0;
    for (const [i, file] of selected.entries()) {
      if (pagesLeft <= 0) {
        truncated = true;
        break;
      }
      options.onProgress?.({ current: i + 1, total: selected.length });
      let extracted: ExtractedText | null;
      try {
        // A corrida garante os 20 s mesmo se o extrator ignorar o sinal.
        extracted = await Promise.race([deps.extractor.extract(file, { signal: controller.signal, maxPages: pagesLeft }), stopped]);
      } catch (error) {
        throw timedOut ? timeoutError() : error;
      }
      if (!extracted) return null;
      engine = extracted.engine;
      const pages = extracted.pages.slice(0, pagesLeft);
      truncated ||= extracted.truncated || pages.length < extracted.pages.length;
      pagesLeft -= Math.max(1, pages.length);
      filesRead += 1;
      texts.push(pages.map((p) => p.text).join('\n'));
    }

    const suggestions = parseHealthDocument(texts.join('\n'), { today: options.today, sex: options.sex });
    const birthDate = options.member.birthDate;
    if (birthDate && suggestions.date && suggestions.date.value < birthDate) {
      suggestions.warnings.push({ code: 'date-before-birth', label: null, evidence: suggestions.date.evidence });
      suggestions.date = null;
    }
    return {
      suggestions,
      patientNameMismatch: isPatientNameMismatch(suggestions.patientName?.value ?? null, options.member.firstName),
      engine,
      truncated,
      filesRead,
    };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onCallerAbort);
  }
}
