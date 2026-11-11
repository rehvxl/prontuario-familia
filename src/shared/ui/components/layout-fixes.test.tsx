import { fireEvent, screen, within } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createTheme, headerOptions, headerTitleColors } from '../theme';
import { renderWithTheme } from '../test-utils';
import { ChipGroup } from './Chip';
import { IconButton } from './IconButton';
import { ListItem } from './ListItem';
import { Screen } from './Screen';
import { Select } from './Select';
import { Text } from './Text';

const flat = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;
const METRICS = { frame: { x: 0, y: 0, width: 393, height: 852 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
type Node = { type: string; props: Record<string, unknown> & { style?: unknown; testID?: string }; children?: (Node | string)[] | null };
/** Raiz real do Screen: primeiro filho do SafeAreaProvider. */
const screenRoot = (): Node => {
  const provider = screen.toJSON() as unknown as Node;
  expect(provider.type).toBe('RNCSafeAreaProvider');
  return provider.children![0] as Node;
};
const renderInScreen = (ui: ReactElement) => renderWithTheme(<SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>);
const OPTIONS = [
  { value: 'exam', label: 'Exames' },
  { value: 'vaccine', label: 'Vacinas' },
] as const;

describe('Screen presentation="sheet" (formSheet nativo)', () => {
  it('a raiz da folha não tem cor nem testID; o ScrollView mantém a cor do tema e recebe o testID', async () => {
    const theme = createTheme('light');
    await renderInScreen(
      <Screen presentation="sheet" footer={<Text>Salvar</Text>} testID="folha">
        <Text>Campo</Text>
      </Screen>,
    );
    const root = screenRoot();
    expect(flat(root).backgroundColor).toBeUndefined();
    expect(root.props.testID).toBeUndefined();
    const scroll = screen.getByTestId('folha');
    expect(scroll.type).toBe('RCTScrollView');
    expect(flat(scroll).backgroundColor).toBe(theme.colors.background);
  });

  it('com scrollViewProps.testID, o testID do Screen vai para o conteúdo, nunca para a raiz', async () => {
    await renderInScreen(
      <Screen presentation="sheet" footer={<Text>Salvar</Text>} testID="folha" scrollViewProps={{ testID: 'scroll' }}>
        <Text>Campo</Text>
      </Screen>,
    );
    expect(screen.getByTestId('scroll').type).toBe('RCTScrollView');
    expect(screen.getByTestId('folha').type).toBe('View');
    expect(screenRoot().props.testID).toBeUndefined();
  });

  it('o padrão continua pintando a raiz (API compatível)', async () => {
    const theme = createTheme('light');
    await renderInScreen(
      <Screen testID="root" footer={<Text>Salvar</Text>}>
        <Text>Campo</Text>
      </Screen>,
    );
    expect(flat(screen.getByTestId('root')).backgroundColor).toBe(theme.colors.background);
  });

  it('sem rolagem, a cor e o testID vão para o corpo', async () => {
    const theme = createTheme('light');
    await renderInScreen(
      <Screen presentation="sheet" scroll={false} testID="corpo">
        <Text>Campo</Text>
      </Screen>,
    );
    expect(flat(screenRoot()).backgroundColor).toBeUndefined();
    expect(screenRoot().props.testID).toBeUndefined();
    expect(flat(screen.getByTestId('corpo')).backgroundColor).toBe(theme.colors.background);
  });
});

describe('Screen com título grande (iOS, rolagem, sem rodapé)', () => {
  it('o ScrollView é a própria raiz, como uma FlatList: sem view intermediária com cor', async () => {
    const theme = createTheme('light');
    await renderInScreen(
      <Screen testID="tela">
        <Text>Conteúdo</Text>
      </Screen>,
    );
    const root = screenRoot();
    expect(root.type).toBe('RCTScrollView');
    expect(root.props.testID).toBe('tela');
    expect(root.props.contentInsetAdjustmentBehavior).toBe('automatic');
    expect(flat(root).backgroundColor).toBe(theme.colors.background);
  });
});

describe('ChipGroup sangra até a borda dentro do Screen', () => {
  it('desfaz o recuo do Screen, alinha o 1º chip à margem e não cresce', async () => {
    const theme = createTheme('light');
    await renderInScreen(
      <Screen>
        <ChipGroup options={[...OPTIONS]} value={[]} onChange={() => {}} allLabel="Todos" testID="chips" />
      </Screen>,
    );
    const chips = screen.getByTestId('chips');
    const style = flat(chips);
    expect(style.flexGrow).toBe(0);
    expect(style.marginHorizontal).toBe(-theme.layout.screenGutter);
    expect(StyleSheet.flatten(chips.props.contentContainerStyle).paddingHorizontal).toBe(theme.layout.screenGutter);
  });

  it('fora do Screen não aplica margem negativa', async () => {
    await renderWithTheme(<ChipGroup options={[...OPTIONS]} value={[]} onChange={() => {}} testID="chips" />);
    expect(flat(screen.getByTestId('chips')).marginHorizontal).toBe(-0);
  });
});

describe('Select (iOS) ocupa a largura toda', () => {
  it('mede a largura disponível e fixa o gatilho do menu nela', async () => {
    await renderWithTheme(<Select label="Parentesco" options={[{ value: 'mae', label: 'Mãe' }]} value="mae" onChange={() => {}} testID="sel" />);
    await fireEvent(screen.getByTestId('sel-frame'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 353, height: 52 } } });
    const field = screen.getByRole('button', { name: 'Parentesco: Mãe' });
    expect(flat(field.parent as never).width).toBe(353);
  });
});

describe('Cor do título do cabeçalho', () => {
  it('título usa a cor de texto do sistema; o tint fica só nos botões', () => {
    const theme = createTheme('light');
    const opts = headerOptions(theme) as Record<string, unknown>;
    expect(opts.headerTintColor).toBe(theme.colors.primary);
    expect(opts.headerTitleStyle).toEqual({ color: theme.native.label });
    expect(opts.headerLargeTitleStyle).toEqual({ color: theme.native.label });
    expect(headerTitleColors(theme).headerLargeTitleStyle.color).not.toBe(theme.colors.primary);
  });

  it('sem blur sobreposto ao Liquid Glass do iOS 26', () => {
    expect((headerOptions(createTheme('light', { glassAvailable: true }), { transparent: true }) as Record<string, unknown>).headerBlurEffect).toBeUndefined();
    expect((headerOptions(createTheme('light', { glassAvailable: false }), { transparent: true }) as Record<string, unknown>).headerBlurEffect).toBe('systemChromeMaterial');
  });
});

describe('ListItem com onPress e controle à direita (VoiceOver/TalkBack)', () => {
  it('o controle da direita é um elemento próprio, fora do botão da linha', async () => {
    const onPress = jest.fn();
    const onMore = jest.fn();
    await renderWithTheme(
      <ListItem title="Ana" subtitle="Mãe" onPress={onPress} testID="row" trailing={<IconButton icon="moreCircle" accessibilityLabel="Mais ações" onPress={onMore} />} />,
    );
    const row = screen.getByRole('button', { name: 'Ana, Mãe' });
    const more = screen.getByRole('button', { name: 'Mais ações' });
    expect(within(row).queryByRole('button', { name: 'Mais ações' })).toBeNull();
    expect(screen.getByTestId('row')).toBe(row);
    await fireEvent.press(row);
    await fireEvent.press(more);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onMore).toHaveBeenCalledTimes(1);
  });

  it('sem onPress (ex.: anexo com botão remover), o controle também fica fora do grupo', async () => {
    await renderWithTheme(<ListItem title="exame.pdf" subtitle="2 MB" trailing={<IconButton icon="closeCircle" accessibilityLabel="Remover anexo" onPress={() => {}} />} />);
    const group = screen.getByLabelText('exame.pdf, 2 MB');
    expect(within(group).queryByRole('button', { name: 'Remover anexo' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Remover anexo' })).toBeTruthy();
  });

  it('sem trailing, a linha continua sendo um único botão com chevron (API igual)', async () => {
    await renderWithTheme(<ListItem title="Sair" onPress={() => {}} testID="sair" />);
    expect(screen.getByRole('button', { name: 'Sair' })).toBe(screen.getByTestId('sair'));
  });
});
