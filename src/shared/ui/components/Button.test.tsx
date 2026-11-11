import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithTheme } from '../test-utils';
import { Button } from './Button';
import { resolveButtonStyle } from './Button.types';

// O jest roda com a plataforma iOS: o Button é o SwiftUI (Button.ios.tsx) dentro de uma View
// acessível. Leitores de tela (e este teste) ativam pela ação "activate".
const activate = (el: ReturnType<typeof screen.getByRole>) =>
  fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

describe('Button', () => {
  it('ativa pelo leitor de tela e expõe papel de botão com o rótulo', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Salvar documento" onPress={onPress} />);
    const btn = screen.getByRole('button', { name: 'Salvar documento' });
    await activate(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('desabilitado não dispara e anuncia o estado', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Salvar" onPress={onPress} disabled />);
    const btn = screen.getByRole('button', { name: 'Salvar' });
    expect(btn).toBeDisabled();
    await activate(btn);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('carregando fica ocupado, bloqueia toque e mantém o rótulo acessível', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Enviando" onPress={onPress} loading />);
    const btn = screen.getByRole('button', { name: 'Enviando' });
    expect(btn).toBeBusy();
    expect(btn).toBeDisabled();
    await activate(btn);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renderiza no tema escuro, com ícone e todos os estilos v2', async () => {
    await renderWithTheme(
      <>
        <Button label="Adicionar" icon="add" variant="secondary" onPress={() => {}} />
        <Button label="Vidro" variant="glass" onPress={() => {}} />
        <Button label="Vidro forte" variant="glassProminent" onPress={() => {}} />
        <Button label="Contorno" variant="bordered" onPress={() => {}} />
        <Button label="Texto" variant="plain" onPress={() => {}} />
      </>,
      'dark',
    );
    for (const name of ['Adicionar', 'Vidro', 'Vidro forte', 'Contorno', 'Texto']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
  });
});

describe('resolveButtonStyle (migração v1 → v2)', () => {
  it('mapeia as variantes v1', () => {
    expect(resolveButtonStyle('primary')).toEqual({ style: 'filled', role: 'default' });
    expect(resolveButtonStyle('secondary')).toEqual({ style: 'bordered', role: 'default' });
    expect(resolveButtonStyle('ghost')).toEqual({ style: 'plain', role: 'default' });
    expect(resolveButtonStyle('destructive')).toEqual({ style: 'filled', role: 'destructive' });
  });
  it('mantém os estilos v2 e respeita role', () => {
    expect(resolveButtonStyle('glass', 'destructive')).toEqual({ style: 'glass', role: 'destructive' });
  });
});
