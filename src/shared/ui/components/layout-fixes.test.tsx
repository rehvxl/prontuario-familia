import { fireEvent, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createTheme, headerOptions, headerTitleColors } from '../theme';
import { renderWithTheme } from '../test-utils';
import { ChipGroup } from './Chip';
import { Screen } from './Screen';
import { Select } from './Select';
import { Text } from './Text';

const flat = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;
const METRICS = { frame: { x: 0, y: 0, width: 393, height: 852 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const renderInScreen = (ui: ReactElement) => renderWithTheme(<SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>);
const OPTIONS = [
  { value: 'exam', label: 'Exames' },
  { value: 'vaccine', label: 'Vacinas' },
] as const;

describe('Screen presentation="sheet" (formSheet nativo)', () => {
  it('a raiz da folha não tem cor de fundo; o ScrollView mantém a cor do tema', async () => {
    const theme = createTheme('light');
    await renderInScreen(
      <Screen presentation="sheet" footer={<Text>Salvar</Text>} testID="root" scrollViewProps={{ testID: 'scroll' }}>
        <Text>Campo</Text>
      </Screen>,
    );
    expect(flat(screen.getByTestId('root')).backgroundColor).toBeUndefined();
    const scroll = screen.getByTestId('scroll');
    expect(flat(scroll).backgroundColor).toBe(theme.colors.background);
  });

  it('o padrão continua pintando a raiz (API compatível)', async () => {
    const theme = createTheme('light');
    await renderInScreen(
      <Screen testID="root">
        <Text>Campo</Text>
      </Screen>,
    );
    expect(flat(screen.getByTestId('root')).backgroundColor).toBe(theme.colors.background);
  });

  it('sem rolagem, a cor vai para o corpo', async () => {
    const theme = createTheme('light');
    await renderInScreen(
      <Screen presentation="sheet" scroll={false} testID="root">
        <Text testID="child">Campo</Text>
      </Screen>,
    );
    expect(flat(screen.getByTestId('root')).backgroundColor).toBeUndefined();
    // primeiro filho da raiz = corpo (o rodapé vem depois)
    const body = screen.getByTestId('root').children[0];
    expect(body && typeof body !== 'string' ? flat(body).backgroundColor : undefined).toBe(theme.colors.background);
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
