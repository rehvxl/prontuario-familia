import { requireOptionalNativeModule } from 'expo';

export type DocumentTextEngineName = 'apple-vision' | 'mlkit-latin';
export type DocumentTextSource = 'pdf-text' | 'ocr';

export interface NativeDocumentTextPage {
  index: number;
  text: string;
  source: DocumentTextSource;
}

export interface NativeDocumentText {
  engine: DocumentTextEngineName;
  /** Total de páginas do arquivo (1 para imagem). */
  pageCount: number;
  /** true se parou antes do fim (limite de páginas ou de 200 mil caracteres). */
  truncated: boolean;
  pages: NativeDocumentTextPage[];
}

export interface ExtractTextOptions {
  /** Padrão 10, máximo 20. */
  maxPages?: number;
  /** Permite cancelar com `cancel(requestId)`. */
  requestId?: string;
}

export interface DocumentTextNativeModule {
  /** `uri`: file:// (iOS e Android) ou content:// (Android). Rejeita com `code` ERR_DOCUMENT_TEXT_*. */
  extractText(uri: string, mimeType: string, options: ExtractTextOptions): Promise<NativeDocumentText>;
  /** Pede a parada; o nativo confere entre páginas e rejeita com ERR_DOCUMENT_TEXT_CANCELLED. */
  cancel(requestId: string): void;
}

/** null no Expo Go, na web e em qualquer build sem o módulo: o app cai no preenchimento manual. */
export default requireOptionalNativeModule<DocumentTextNativeModule>('DocumentText');
