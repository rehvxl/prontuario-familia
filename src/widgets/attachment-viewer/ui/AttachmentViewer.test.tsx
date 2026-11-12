import type { QueryClient } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Attachment } from '@/entities/health-record';
import { renderWithDependencies } from '@/shared/lib/testing';
import { ThemeProvider } from '@/shared/ui';
import { AttachmentViewer } from './AttachmentViewer';

jest.mock('react-native-webview', () => ({ WebView: () => null }));

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const attachment = (over: Partial<Attachment> = {}): Attachment => ({
  id: 'a1',
  recordId: 'r1',
  storagePath: 'f1/r1/a1.jpg',
  fileName: 'receita.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1000,
  createdAt: '2026-11-11T10:00:00.000Z',
  ...over,
});

// useAttachmentUrl agenda gcTime de 240 s: sem limpar o cliente, o timer prende o Jest depois dos testes.
let client: QueryClient | undefined;
afterEach(() => client?.clear());

async function show(a: Attachment, getViewUrl: () => Promise<string>, onClose = jest.fn()) {
  const { wrapper: Deps, queryClient } = renderWithDependencies({ storage: { getViewUrl } });
  client = queryClient;
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ThemeProvider scheme="light" reducedMotion>
        <Deps>
          <AttachmentViewer attachment={a} onClose={onClose} />
        </Deps>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  return onClose;
}

describe('AttachmentViewer', () => {
  it('imagem em tela cheia com nome acessível; "Fechar arquivo" fecha', async () => {
    const onClose = await show(attachment(), async () => 'file:///receita.jpg');
    expect(await screen.findByLabelText('Imagem receita.jpg')).toBeOnTheScreen();
    expect(screen.getByText('receita.jpg')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Fechar arquivo' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('PDF no iOS: visualizador com botão "Fechar" na base', async () => {
    await show(attachment({ fileName: 'laudo.pdf', mimeType: 'application/pdf', storagePath: 'f1/r1/a1.pdf' }), async () => 'file:///laudo.pdf');
    expect(await screen.findByRole('button', { name: 'Fechar' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Fechar arquivo' })).toBeOnTheScreen();
  });

  it('erro ao obter o arquivo: mensagem calma e "Fechar"', async () => {
    await show(attachment(), () => Promise.reject(new Error('rede')));
    expect(await screen.findByText('Não foi possível abrir o arquivo')).toBeOnTheScreen();
    expect(screen.getByText('Verifique a conexão e tente de novo. O arquivo continua guardado.')).toBeOnTheScreen();
  });
});
