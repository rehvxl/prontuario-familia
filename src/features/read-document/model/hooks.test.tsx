import { act, renderHook } from '@testing-library/react-native';
import type { LocalFile } from '@/entities/health-record';
import { DEPENDENCY_KEYS } from '@/shared/lib';
import { renderWithDependencies } from '@/shared/lib/testing';
import * as F from '../domain/__fixtures__/documents';
import type { DocumentTextExtractor } from '../domain/document-text';
import { useReadDocument } from './hooks';

const files: LocalFile[] = [{ uri: 'file:///cache/hemograma.pdf', fileName: 'hemograma.pdf', mimeType: 'application/pdf', sizeBytes: 10 }];
const member = { firstName: 'Ana', birthDate: '1988-02-14' };

async function setup(extractor: DocumentTextExtractor) {
  const { wrapper, queryClient } = renderWithDependencies({ [DEPENDENCY_KEYS.documentText]: extractor });
  return { queryClient, ...(await renderHook(() => useReadDocument(), { wrapper })) };
}

describe('useReadDocument', () => {
  it('lê com o extrator da DI e não deixa o resultado no cache (gcTime 0)', async () => {
    const extractor: DocumentTextExtractor = {
      availability: 'demo',
      extract: async () => ({ engine: 'demo', pageCount: 1, truncated: false, pages: [{ index: 0, text: F.HEMOGRAMA_HORIZONTE, source: 'demo' }] }),
    };
    const { result, queryClient } = await setup(extractor);
    expect(result.current.availability).toBe('demo');
    let read: Awaited<ReturnType<typeof result.current.mutateAsync>> = null;
    await act(async () => {
      read = await result.current.mutateAsync({ files, member });
    });
    expect(read!.suggestions.labResults).toHaveLength(9);
    expect(queryClient.getMutationCache().getAll().every((m) => m.options.gcTime === 0)).toBe(true);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('cancel() aborta a leitura em andamento', async () => {
    let signal: AbortSignal | undefined;
    const extractor: DocumentTextExtractor = {
      availability: 'device',
      extract: (_f, o) => {
        signal = o?.signal;
        return new Promise(() => undefined);
      },
    };
    const { result } = await setup(extractor);
    let outcome: Promise<unknown> = Promise.resolve();
    await act(async () => {
      outcome = result.current.mutateAsync({ files, member }).catch((e: unknown) => e);
    });
    await act(async () => result.current.cancel());
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      await expect(outcome).resolves.toMatchObject({ code: 'ocr/cancelled' });
    });
  });

  it('aborta ao desmontar a tela', async () => {
    let signal: AbortSignal | undefined;
    const extractor: DocumentTextExtractor = {
      availability: 'device',
      extract: (_f, o) => {
        signal = o?.signal;
        return new Promise(() => undefined);
      },
    };
    const { result, unmount } = await setup(extractor);
    await act(async () => {
      void result.current.mutateAsync({ files, member }).catch(() => undefined);
    });
    await unmount();
    expect(signal?.aborted).toBe(true);
  });
});
