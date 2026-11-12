// Porta do leitor de texto (ocr-tecnico.md §b.2). Contrato congelado na F0; adaptadores: F4.
import type { LocalFile } from '@/entities/health-record';

export type ExtractedTextSource = 'pdf-text' | 'ocr' | 'demo';

export interface ExtractedPage {
  index: number;
  text: string;
  source: ExtractedTextSource;
}

export interface ExtractedText {
  engine: 'apple-vision' | 'mlkit-latin' | 'demo';
  pageCount: number;
  truncated: boolean;
  pages: ExtractedPage[];
}

/** `device` = leitor nativo; `demo` = texto simulado; `unavailable` = Expo Go/web (só preenchimento manual). */
export type DocumentTextAvailability = 'device' | 'demo' | 'unavailable';

/**
 * Extrai o texto de um arquivo local (PDF ou imagem) NO APARELHO.
 * Devolve `null` quando não há leitor neste ambiente. Erros: `DomainError` com código `ocr/*` e mensagem pt-BR.
 * O texto devolvido é dado de saúde: não logar, não persistir, não colocar em chave de cache.
 */
export interface DocumentTextExtractor {
  readonly availability: DocumentTextAvailability;
  extract(file: LocalFile, options?: { signal?: AbortSignal; maxPages?: number }): Promise<ExtractedText | null>;
}
