// Hook da leitura (ocr-tecnico.md §b.5). O resultado vive só na mutation (gcTime 0) e no estado da tela (P3).
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import type { LocalFile } from '@/entities/health-record';
import { DEPENDENCY_KEYS, toLocalIsoDate, useDependency } from '@/shared/lib';
import type { DocumentTextAvailability, DocumentTextExtractor } from '../domain/document-text';
import { readDocument, type ReadDocumentOptions, type ReadDocumentResult } from '../domain/read-document';

export interface ReadDocumentInput {
  files: LocalFile[];
  sex?: 'female' | 'male';
  member: ReadDocumentOptions['member'];
}

export interface UseReadDocument {
  mutateAsync(input: ReadDocumentInput): Promise<ReadDocumentResult | null>;
  reset(): void;
  isPending: boolean;
  availability: DocumentTextAvailability;
  cancel(): void;
}

export const useDocumentTextExtractor = () => useDependency<DocumentTextExtractor>(DEPENDENCY_KEYS.documentText);

/** Lê os anexos e devolve sugestões. Cancela ao desmontar; o resultado não fica no cache. */
export function useReadDocument(onProgress?: (p: { current: number; total: number }) => void): UseReadDocument {
  const extractor = useDocumentTextExtractor();
  const controller = useRef<AbortController | null>(null);
  const progress = useRef(onProgress);
  useEffect(() => {
    progress.current = onProgress;
  }, [onProgress]);
  useEffect(() => () => controller.current?.abort(), []);

  const mutation = useMutation({
    gcTime: 0,
    mutationFn: ({ files, sex, member }: ReadDocumentInput) => {
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      return readDocument({ extractor }, files, {
        today: toLocalIsoDate(),
        sex,
        member,
        signal: current.signal,
        onProgress: (p) => {
          if (!current.signal.aborted) progress.current?.(p);
        },
      });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    reset: mutation.reset,
    isPending: mutation.isPending,
    availability: extractor.availability,
    cancel: () => controller.current?.abort(),
  };
}
