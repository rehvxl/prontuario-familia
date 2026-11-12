import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/shared/ui';
import { ScanProgress } from './ScanProgress';

// O jest roda como iOS: o Button é SwiftUI e é ativado pela ação de acessibilidade "activate".
const activate = (el: ReturnType<typeof screen.getByRole>) =>
  fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

const renderScan = async (props: Partial<Parameters<typeof ScanProgress>[0]> = {}) => {
  const onSkip = jest.fn();
  await render(
    <ThemeProvider scheme="light" reducedMotion>
      <ScanProgress current={1} total={1} onSkip={onSkip} {...props} />
    </ThemeProvider>,
  );
  return onSkip;
};

describe('ScanProgress', () => {
  it('mostra o título, a nota de privacidade e "Pular leitura"', async () => {
    const onSkip = await renderScan();
    expect(screen.getByText('Lendo o documento…')).toBeTruthy();
    expect(screen.getByText('Lido no aparelho, sem internet.')).toBeTruthy();
    await activate(screen.getByRole('button', { name: 'Pular leitura' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('com um arquivo só, não há barra nem contagem', async () => {
    await renderScan();
    expect(screen.queryByText('1 de 1')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('com mais de um arquivo, mostra "1 de 2" e a barra', async () => {
    await renderScan({ current: 1, total: 2 });
    expect(screen.getByText('1 de 2')).toBeTruthy();
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('não usa palavras vetadas nem exclamação', async () => {
    await renderScan({ current: 2, total: 3 });
    const texts = screen.getAllByText(/./).map((n) => String(n.props.children));
    expect(texts.join(' ')).not.toMatch(/normal|alerta|urgente|!/i);
  });
});
