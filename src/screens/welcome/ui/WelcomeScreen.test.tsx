import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/shared/ui';
import { WelcomeScreen } from './WelcomeScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const activate = (el: Parameters<typeof fireEvent>[0]) => fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
const press = (name: string) => activate(screen.getByRole('button', { name }));

/** Palavras vetadas em telas de saúde (spec §3.2) e exclamação. */
const VETOED = /\b(normal|anormal|alterad[oa]|grave|crítico|risco|perigo|alerta|urgente|preocupante|saudável|doente|bom|ruim)\b|!/i;
const allText = () => JSON.stringify(screen.toJSON());

const renderWelcome = () =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ThemeProvider scheme="light" reducedMotion>
        <WelcomeScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );

beforeEach(() => mockPush.mockClear());

describe('WelcomeScreen (DESIGN_SYSTEM.md §7.13)', () => {
  it('três passos com "Passo n de 3" em texto; o 2 mostra a linha de exemplo com a régua; o 3, a leitura no aparelho', async () => {
    await renderWelcome();
    expect(screen.getByText('Passo 1 de 3')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'A pasta da família, no celular' })).toBeOnTheScreen();
    expect(screen.queryByTestId('welcome-example')).toBeNull();

    await press('Continuar');
    expect(screen.getByText('Passo 2 de 3')).toBeOnTheScreen();
    expect(screen.getByTestId('welcome-example')).toBeOnTheScreen();
    expect(screen.getByText('Exemplo')).toBeOnTheScreen();
    expect(screen.getByText('Dentro da faixa do laudo')).toBeOnTheScreen();
    expect(screen.getByLabelText('5,4 por cento, dentro da faixa do laudo')).toBeOnTheScreen();

    await press('Continuar');
    expect(screen.getByText('Passo 3 de 3')).toBeOnTheScreen();
    expect(screen.getByText('A leitura dos documentos é feita no aparelho')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Pular' })).toBeNull();

    await press('Começar');
    expect(mockPush).toHaveBeenCalledWith('/(onboarding)/consent');
  });

  it('C7: cada passo tem um exemplo do app no meio e o texto embaixo, perto do botão; o passo 1 é a pasta com os tipos', async () => {
    await renderWelcome();
    const folder = screen.getByTestId('welcome-folder', { includeHiddenElements: true });
    // Decorativo para o leitor de tela (a frase do passo diz o mesmo), mas rotulado "Exemplo" na tela.
    expect(folder.props.accessibilityElementsHidden).toBe(true);
    for (const t of ['Exemplo', 'Hemograma completo', 'Resultado · Laboratório Vida', 'Receita · Dra. Paula Lima', 'Vacina · Dose única']) {
      expect(screen.getByText(t, { includeHiddenElements: true })).toBeTruthy();
    }
    const json = allText();
    expect(json.indexOf('"welcome-visual"')).toBeLessThan(json.indexOf('"welcome-text"'));
    expect(json.indexOf('"welcome-step"')).toBeLessThan(json.indexOf('"welcome-visual"'));

    await press('Continuar');
    await press('Continuar');
    expect(screen.getByTestId('welcome-on-device')).toBeOnTheScreen();
  });

  it('v4: a pasta ganha uma divisória por passo (régua decorativa) e o passo 2 abre na divisória do Carlos', async () => {
    await renderWelcome();
    const tabs = () => screen.getAllByTestId(/^tab-/, { includeHiddenElements: true });
    const selected = () => tabs().find((t) => t.props.accessibilityState?.selected)?.props.accessibilityLabel;
    expect(screen.getByTestId('welcome-rail', { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
    expect(tabs()).toHaveLength(1);
    expect(selected()).toBe('Família');
    await press('Continuar');
    expect(tabs()).toHaveLength(2);
    expect(selected()).toMatch(/^Carlos/);
    await press('Continuar');
    expect(tabs()).toHaveLength(4);
    expect(selected()).toBe('Família');
  });

  it('"Pular" vai direto ao consentimento', async () => {
    await renderWelcome();
    await press('Pular');
    expect(mockPush).toHaveBeenCalledWith('/(onboarding)/consent');
  });

  it('nenhum passo usa palavra vetada nem exclamação (spec §3.2)', async () => {
    await renderWelcome();
    for (let i = 0; i < 3; i++) {
      expect(allText()).not.toMatch(VETOED);
      if (i < 2) await press('Continuar');
    }
  });
});
