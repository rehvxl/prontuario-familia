import { fireEvent, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { createTheme, headerOptions } from '../theme';
import { renderWithTheme } from '../test-utils';
import { Card } from './Card';
import { FloatingActionButton } from './FloatingActionButton';
import { GlassSurface } from './GlassSurface';
import { ICON_MAP, nativeIcon, resolveIcon } from './Icon';
import { ListItem } from './ListItem';
import { ListSection } from './ListSection';
import { Menu } from './Menu';
import { SegmentedControl } from './SegmentedControl';
import { Select } from './Select';
import { Switch } from './Switch';
import { Text } from './Text';

describe('Icon (SF Symbols / Material Symbols)', () => {
  it('resolve nomes semânticos e legados (Ionicons v1)', () => {
    expect(resolveIcon('add')).toEqual(ICON_MAP.add);
    expect(resolveIcon('chevron-forward')).toEqual(ICON_MAP.forward);
    expect(resolveIcon('calendar-outline')?.sf).toBe('calendar');
    expect(resolveIcon('logo-google')).toBeUndefined();
  });
  it('nativeIcon devolve o par {sf, md} com variante selecionada', () => {
    expect(nativeIcon('people', { selected: true })).toEqual({
      sf: { default: 'person.2', selected: 'person.2.fill' },
      md: 'group',
    });
    expect(nativeIcon('add')).toEqual({ sf: 'plus', md: 'add' });
  });
});

describe('Tema v2', () => {
  it('vidro só fica ativo com a API disponível e sem "Reduzir transparência"', () => {
    expect(createTheme('light', { glassAvailable: true }).glass.enabled).toBe(true);
    expect(createTheme('light', { glassAvailable: true, reduceTransparency: true }).glass.enabled).toBe(false);
    expect(createTheme('light', { glassAvailable: false }).glass.enabled).toBe(false);
  });
  it('headerOptions usa título grande e fundo agrupado no iOS', () => {
    const opts = headerOptions(createTheme('light'));
    expect(Platform.OS).toBe('ios');
    expect(opts).toMatchObject({ headerLargeTitle: true, headerShadowVisible: false });
  });
});

describe('Card', () => {
  it('cartão tocável com acento categórico é um botão com rótulo', async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <Card accent={2} onPress={onPress} accessibilityLabel="Hemograma, 3 de março">
        <Text>Hemograma</Text>
      </Card>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Hemograma, 3 de março' }));
    expect(onPress).toHaveBeenCalled();
  });
  it('aceita a prop v1 `tab`', async () => {
    await renderWithTheme(
      <Card tab={1} testID="c">
        <Text>Ok</Text>
      </Card>,
    );
    expect(screen.getByTestId('c')).toBeTruthy();
  });
});

describe('ListSection + ListItem', () => {
  it('mostra cabeçalho como título, itens e rodapé', async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <ListSection header="Conta" footer="Só você vê estes dados.">
        <ListItem title="E-mail" meta="ana@exemplo.com" />
        <ListItem title="Sair" onPress={onPress} chevron={false} />
      </ListSection>,
    );
    expect(screen.getByRole('header', { name: 'Conta' })).toBeTruthy();
    expect(screen.getByText('Só você vê estes dados.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /Sair/ }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('Switch', () => {
  it('a linha inteira alterna e anuncia o estado', async () => {
    const onChange = jest.fn();
    await renderWithTheme(<Switch label="Lembretes" description="Um dia antes" value={false} onValueChange={onChange} />);
    const sw = screen.getByRole('switch', { name: 'Lembretes' });
    expect(sw).not.toBeChecked();
    await fireEvent.press(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });
  it('desabilitado não alterna', async () => {
    const onChange = jest.fn();
    await renderWithTheme(<Switch label="Lembretes" value onValueChange={onChange} disabled />);
    await fireEvent.press(screen.getByRole('switch', { name: 'Lembretes' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('Componentes nativos renderizam (iOS no jest)', () => {
  it('GlassSurface, FAB, Menu, Select e SegmentedControl montam sem erro', async () => {
    await renderWithTheme(
      <>
        <GlassSurface testID="glass">
          <Text>Sem conexão</Text>
        </GlassSurface>
        <FloatingActionButton icon="add" label="Novo registro" onPress={() => {}} />
        <Menu items={[{ label: 'Editar', icon: 'edit' }, { label: 'Excluir', icon: 'trash', destructive: true }]}>
          <Text>Mais</Text>
        </Menu>
        <Select label="Parentesco" options={[{ value: 'mae', label: 'Mãe' }]} value="mae" onChange={() => {}} />
        <SegmentedControl
          accessibilityLabel="Ordenar"
          options={[{ value: 'data', label: 'Data' }, { value: 'tipo', label: 'Tipo' }]}
          value="data"
          onChange={() => {}}
        />
      </>,
      'dark',
    );
    expect(screen.getByTestId('glass')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Novo registro' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Parentesco: Mãe' })).toBeTruthy();
  });
  it('FAB ativa pela ação de acessibilidade', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<FloatingActionButton icon="add" label="Novo registro" onPress={onPress} />);
    await fireEvent(screen.getByRole('button', { name: 'Novo registro' }), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(onPress).toHaveBeenCalled();
  });
});
