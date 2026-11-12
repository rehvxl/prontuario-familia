// Leitor do modo demonstração sem módulo nativo (ocr-tecnico.md §b.3; spec F1.12). Texto fictício pelo nome do arquivo.
import { DomainError } from '@/shared/lib';
import * as FIXTURES from '../domain/__fixtures__/documents';
import type { DocumentTextExtractor } from '../domain/document-text';

/** Nome do arquivo → texto simulado. Foto da câmera ("foto-1.jpg") cai no hemograma. */
const BY_FILE_NAME: readonly (readonly [RegExp, string])[] = [
  [/receita|receituario/i, FIXTURES.RECEITA_VIVER_BEM],
  [/vacina|carteira/i, FIXTURES.VACINAS_IMUNIZAR],
  [/lipid|colesterol|tireoide/i, FIXTURES.LIPIDOS_TIREOIDE_SANTA_MONICA],
  [/glicose|glicada|creatinina|bioquimica/i, FIXTURES.BIOQUIMICA_CERRADO],
  [/renal|hepatic|figado/i, FIXTURES.RENAL_HEPATICO_SANTA_CLARA],
  [/urina|eas/i, FIXTURES.URINA_HEMOGRAMA_VIDA_PLENA],
  [/vitamina|ferritina/i, FIXTURES.FOTO_SAO_LUCAS_OCR],
  [/laudo|ultrass|usg|imagem/i, FIXTURES.LAUDO_USG_IMAGEM_VIVA],
];

const cancelled = () => new DomainError('ocr/cancelled', 'Leitura cancelada.');

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(cancelled());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Texto simulado para o nome do arquivo; o padrão é o hemograma. */
export function demoTextFor(fileName: string): string {
  return BY_FILE_NAME.find(([pattern]) => pattern.test(fileName))?.[1] ?? FIXTURES.HEMOGRAMA_HORIZONTE;
}

/** Modo demonstração sem módulo nativo (Expo Go): texto fictício, com espera para exercitar progresso e cancelar. */
export function createDemoDocumentTextExtractor(delayMs = 900): DocumentTextExtractor {
  return {
    availability: 'demo',
    async extract(file, { signal } = {}) {
      if (signal?.aborted) throw cancelled();
      await wait(delayMs, signal);
      return { engine: 'demo', pageCount: 1, truncated: false, pages: [{ index: 0, text: demoTextFor(file.fileName), source: 'demo' }] };
    },
  };
}
