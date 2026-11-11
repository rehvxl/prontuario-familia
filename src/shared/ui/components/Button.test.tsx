import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithTheme } from '../test-utils';
import { Button } from './Button';

describe('Button', () => {
  it('dispara onPress e expõe papel de botão com o rótulo', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Salvar documento" onPress={onPress} />);
    const btn = screen.getByRole('button', { name: 'Salvar documento' });
    await fireEvent.press(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('desabilitado não dispara e anuncia o estado', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Salvar" onPress={onPress} disabled />);
    const btn = screen.getByRole('button', { name: 'Salvar' });
    expect(btn).toBeDisabled();
    await fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('carregando fica ocupado, bloqueia toque e mantém o rótulo acessível', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Enviando" onPress={onPress} loading />);
    const btn = screen.getByRole('button', { name: 'Enviando' });
    expect(btn).toBeBusy();
    expect(btn).toBeDisabled();
    await fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renderiza no tema escuro e com ícone', async () => {
    await renderWithTheme(<Button label="Adicionar" icon="add" variant="secondary" onPress={() => {}} />, 'dark');
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeTruthy();
  });
});
