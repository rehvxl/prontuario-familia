import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DomainError } from '@/shared/lib';
import { ThemeProvider } from '@/shared/ui';
import { BIRTH_DATE_HINT, MemberForm, type MemberFormProps } from './MemberForm';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const activate = (el: Parameters<typeof fireEvent>[0]) => fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
/** `Select` no iOS mede o campo antes de montar o menu nativo; a ação chega como `pressAction`. */
const chooseOption = async (name: RegExp, value: string) => {
  await fireEvent(screen.getByRole('button', { name }), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 48 } } });
  await fireEvent(await screen.findByRole('button', { name }), 'pressAction', { nativeEvent: { event: value } });
};

const show = (props: Partial<MemberFormProps> = {}) =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ThemeProvider scheme="light" reducedMotion>
        <MemberForm submitLabel="Adicionar pessoa" onSubmit={jest.fn()} {...props} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );

describe('MemberForm', () => {
  it('a data de nascimento traz a dica "Usada para o calendário de vacinas" (v0.2, F3)', async () => {
    await show();
    expect(BIRTH_DATE_HINT).toBe('Usada para o calendário de vacinas');
    expect(screen.getByText('Usada para o calendário de vacinas')).toBeOnTheScreen();
  });

  it('a prévia do avatar mostra o nome ao digitar e fica fora do leitor de tela', async () => {
    await show();
    const preview = screen.getByTestId('member-avatar-preview', { includeHiddenElements: true });
    expect(preview).toHaveTextContent('Nova pessoa');
    expect(preview.props.accessibilityElementsHidden).toBe(true);
    await fireEvent.changeText(screen.getByTestId('member-name'), 'Lia Souza');
    expect(preview).toHaveTextContent(/Lia Souza/);
    // Pessoa nova: capa neutra com as iniciais (a cor da divisória só existe depois de salvar).
    expect(preview).toHaveTextContent(/^LS/);
  });

  it('valida ao enviar: nome e parentesco obrigatórios, sem chamar onSubmit', async () => {
    const onSubmit = jest.fn();
    await show({ onSubmit });
    await activate(screen.getByRole('button', { name: 'Adicionar pessoa' }));
    expect(screen.getByText('Informe o nome da pessoa.')).toBeOnTheScreen();
    expect(screen.getByText('Escolha o parentesco.')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('com nome e parentesco envia os valores (nascimento opcional)', async () => {
    const onSubmit = jest.fn();
    await show({ onSubmit });
    await fireEvent.changeText(screen.getByTestId('member-name'), 'Lia Souza');
    await chooseOption(/Parentesco/, 'child');
    await activate(screen.getByRole('button', { name: 'Adicionar pessoa' }));
    expect(onSubmit).toHaveBeenCalledWith({ fullName: 'Lia Souza', birthDate: null, relationship: 'child', sex: 'unspecified' });
  });

  it('erro de data do caso de uso aparece no campo; outros erros num aviso', async () => {
    await show({ error: new DomainError('member/future-birth-date', 'A data de nascimento não pode ser no futuro.') });
    expect(screen.getByText('A data de nascimento não pode ser no futuro.')).toBeOnTheScreen();
  });
});
