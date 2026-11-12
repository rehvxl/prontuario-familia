import { fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { RAIL_TAB_ROLE , TabRail, tabHeights } from './TabRail';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text as RNText } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Catalog } from '../__catalog__/Catalog';
import { createTheme, headerOptions, HueProvider, ThemeProvider, useTheme, withHue } from '../theme';
import { renderWithTheme } from '../test-utils';
import { categoricalIndexFor } from '../lib/identity';
import { AttentionList } from './AttentionList';
import { Button } from './Button';
import { DividerBoard } from './DividerBoard';
import { Leaf } from './Leaf';
import { ListItem } from './ListItem';
import { ListSection } from './ListSection';
import { Screen } from './Screen';
import { StateLine } from './StateLine';
import { SectionHeader } from './SectionHeader';
import { TabMark } from './TabMark';
import { TREND_LAST_LEGEND, TrendChart } from './TrendChart';
import { ICON_FONT_SCALE_CAP, useIconScale } from '../lib/a11y';
import { Text } from './Text';

const flat = (el: { props: { style?: unknown } }) => (StyleSheet.flatten(el.props.style as never) ?? {}) as Record<string, unknown>;
const H = { includeHiddenElements: true };
const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const withSafeArea = (ui: ReactNode) => <SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>;

let mockScale = 1;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: mockScale }),
}));
function mockFontScale(fontScale: number) {
  mockScale = fontScale;
}

afterEach(() => {
  mockScale = 1;
});

describe('tema v4: divisória atual', () => {
  it('a família é o padrão; personBoard é estável por id e dá a volta nos 7 matizes', () => {
    const theme = createTheme('light');
    expect(theme.hue.name).toBe('ultramar');
    expect(theme.personBoard(categoricalIndexFor('m-carlos'))).toBe(theme.personBoard(categoricalIndexFor('m-carlos')));
    expect(theme.hues.people).toHaveLength(7);
    expect(theme.personBoard(7)).toBe(theme.personBoard(0));
    expect(theme.personBoard(-1)).toBe(theme.personBoard(6));
  });

  it('withHue troca primary, focusRing e rangeBand pela tinta da pessoa, no esquema do tema', () => {
    const dark = createTheme('dark');
    const grama = withHue(dark, createTheme('light').hues.byName.grama);
    expect(grama.hue).toBe(dark.hues.byName.grama);
    expect(grama.colors.primary).toBe(dark.hues.byName.grama.ink);
    expect(grama.colors.onPrimary).toBe(dark.hues.byName.grama.onInk);
    expect(grama.colors.focusRing).toBe(dark.hues.byName.grama.ink);
    expect(grama.colors.rangeBand).toBe(dark.hues.byName.grama.soft);
    expect(grama.colors.textPrimary).toBe(dark.colors.textPrimary);
  });

  it('HueProvider pinta o botão cheio na tinta da pessoa', async () => {
    await renderWithTheme(
      <HueProvider hue="petroleo">
        <Button label="Salvar registro" onPress={() => {}} testID="b" />
      </HueProvider>,
    );
    // jest roda como iOS: o invólucro carrega o papel; a cor chega ao SwiftUI pelo tint.
    expect(JSON.stringify(screen.toJSON())).toContain(createTheme('light').hues.byName.petroleo.ink);
  });

  it('fonte: Archivo por peso; sem a fonte carregada, a do sistema', () => {
    expect(createTheme('light').font('600')).toBe('ArchivoSC-SemiBold');
    expect(createTheme('light', { fontsLoaded: false }).font('400')).toBe('System');
  });

  it('headerOptions com board: opaco na cor da divisória, título e botões em onBoard', () => {
    const theme = createTheme('light');
    const cromo = theme.hues.byName.cromo;
    const opts = headerOptions(theme, { board: 'cromo', contentTitle: true }) as Record<string, unknown>;
    expect(opts).toMatchObject({ headerTransparent: false, headerLargeTitle: false, headerTintColor: cromo.onBoard, headerTitle: '' });
    expect(opts.headerStyle).toEqual({ backgroundColor: cromo.board });
    expect(opts.headerTitleStyle).toEqual({ color: cromo.onBoard, fontFamily: 'ArchivoSC-SemiBold' });
  });
});

describe('Text v4', () => {
  it('escolhe o arquivo pelo peso, inclusive quando o estilo muda o peso', async () => {
    await renderWithTheme(
      <>
        <Text>Corpo</Text>
        <Text variant="largeTitle">Família Souza</Text>
        <Text style={{ fontWeight: '600' }}>Forte</Text>
      </>,
    );
    expect(flat(screen.getByText('Corpo')).fontFamily).toBe('ArchivoSC-Regular');
    expect(flat(screen.getByText('Família Souza')).fontFamily).toBe('ArchivoSC-Bold');
    expect(flat(screen.getByText('Forte')).fontFamily).toBe('ArchivoSC-SemiBold');
  });

  it('no Android tira o fontWeight (o arquivo já é o peso)', async () => {
    const os = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
    try {
      await renderWithTheme(<Text style={{ fontWeight: '700' }}>Bold</Text>);
      const style = flat(screen.getByText('Bold'));
      expect(style.fontFamily).toBe('ArchivoSC-Bold');
      expect(style.fontWeight).toBeUndefined();
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
    }
  });

  it('sem a fonte, cai para a do sistema e mantém o peso', async () => {
    await render(
      <ThemeProvider scheme="light" fontsLoaded={false}>
        <Text style={{ fontWeight: '600' }}>Sistema</Text>
      </ThemeProvider>,
    );
    expect(flat(screen.getByText('Sistema'))).toMatchObject({ fontFamily: 'System', fontWeight: '600' });
  });
});

describe('DividerBoard + Leaf', () => {
  it('fundo de cor plena, folha leitosa sem furos e de tom fixo; filhos na tinta da pessoa', async () => {
    let inner: ReturnType<typeof useTheme> | undefined;
    function Probe() {
      inner = useTheme();
      return null;
    }
    await renderWithTheme(
      withSafeArea(
        <DividerBoard hue="violeta" edges={['top']} testID="board">
          <Leaf testID="leaf">
            <Probe />
          </Leaf>
        </DividerBoard>,
      ),
    );
    const violeta = createTheme('light').hues.byName.violeta;
    expect(flat(screen.getByTestId('board'))).toMatchObject({ backgroundColor: violeta.board, paddingTop: 47 + 4 });
    const leaf = flat(screen.getByTestId('leaf'));
    expect(leaf).toMatchObject({ backgroundColor: violeta.leaf, borderTopRightRadius: 16 });
    // Borda pousada: sombra deslocada para a direita e para cima, com desfoque (as abas saem de trás).
    expect(leaf.boxShadow).toMatch(/^2px -1px 6px rgba/);
    // Sem furos (custavam largura e liam como marcador); o papel é o mesmo em toda a pasta.
    expect(screen.queryAllByTestId('leaf-hole', H)).toHaveLength(0);
    expect(violeta.leaf).toBe(createTheme('light').hues.family.leaf);
    expect(inner?.colors.primary).toBe(violeta.ink);
    // Dentro da folha, "a cor da folha" é a folha tingida (pontos vazados, véu, marcador da régua).
    expect(inner?.colors.background).toBe(violeta.leaf);
  });

  it('no escuro, a folha é o grafite leitoso sobre o matiz profundo', async () => {
    let inner: ReturnType<typeof useTheme> | undefined;
    function Probe() {
      inner = useTheme();
      return null;
    }
    await renderWithTheme(
      withSafeArea(
        <DividerBoard hue="cromo" edges={['top']}>
          <Leaf testID="leaf">
            <Probe />
          </Leaf>
        </DividerBoard>,
      ),
      'dark',
    );
    expect(flat(screen.getByTestId('leaf')).backgroundColor).toBe('#1E2029');
    expect(inner?.colors.background).toBe('#1E2029');
  });

  it('Screen board monta divisória, folha e régua, com a margem de texto de 20 pt', async () => {
    await renderWithTheme(
      withSafeArea(
        <Screen board="grama" rail={<RNText>régua</RNText>} heading={{ title: 'Lia Souza' }} testID="s">
          <Text>Conteúdo</Text>
        </Screen>,
      ),
    );
    expect(screen.getByText('régua')).toBeTruthy();
    expect(screen.queryAllByTestId('leaf-hole', H)).toHaveLength(0);
    expect(flat(screen.getByTestId('s')).paddingLeft ?? (screen.getByTestId('s').props.contentContainerStyle as { paddingLeft?: number }[])).toBeTruthy();
    const title = screen.getByRole('header', { name: 'Lia Souza' });
    expect(flat(title).color).toBe(createTheme('light').hues.byName.grama.ink);
    expect(screen.queryByTestId('scroll-edge-veil', H)).toBeNull();
  });

  it('Screen sheet ignora board', async () => {
    await renderWithTheme(
      withSafeArea(
        <Screen board="grama" presentation="sheet">
          <Text>Folha</Text>
        </Screen>,
      ),
    );
    expect(screen.queryAllByTestId('leaf-hole', H)).toHaveLength(0);
  });
});

describe('TabRail', () => {
  const items = [
    { id: 'family', label: 'Família', hue: 'ultramar' as const, selected: true },
    { id: 'ana', label: 'Ana', count: 0, hue: 'oxido' as const },
    { id: 'carlos', label: 'Carlos', count: 6, hue: 'cromo' as const },
    { id: 'lia', label: 'Lia', count: 4, hue: 'grama' as const },
    { id: 'dirce', label: 'Dirce', count: 2, hue: 'petroleo' as const },
  ];

  it('alturas fixas: pessoas iguais (maior nome + contagem), Família do tamanho do nome; a seleção não muda nada', () => {
    // "Família" = 7 letras × 8 + 18; pessoas = "Carlos" (6 × 8 + 18) + linha do número (20).
    expect(tabHeights(items, 64)).toEqual([74, 86, 86, 86, 86]);
    expect(tabHeights(items, 64, 1.35)).toEqual([94, 103, 103, 103, 103]);
    expect(tabHeights(items, 64, 3)).toEqual(tabHeights(items, 64, 1.35));
    expect(tabHeights([{ count: 0 }, { count: 0 }], 64)).toEqual([64, 64]);
    const lia = { label: 'Lia', hue: 'grama' as const };
    expect(tabHeights([{ ...lia, count: 1 }, { ...lia, count: 6 }], 64)).toEqual([64, 64]);
  });

  it('a aba atual da pessoa mantém a contagem escrita', async () => {
    mockFontScale(1);
    const person = items.map((i) => ({ ...i, selected: i.id === 'lia' }));
    await renderWithTheme(<TabRail items={person} onSelect={() => {}} />);
    const lia = screen.getByRole(RAIL_TAB_ROLE, { name: 'Lia, 4 documentos' });
    expect(lia.props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('tablist com tab + selecionado, contagem lida e escrita; toque troca', async () => {
    mockFontScale(1);
    const onSelect = jest.fn();
    await renderWithTheme(<TabRail items={items} onSelect={onSelect} />);
    expect(screen.getByLabelText('Divisórias da pasta').props.accessibilityRole).toBe('tablist');
    const carlos = screen.getByRole(RAIL_TAB_ROLE, { name: 'Carlos, 6 documentos' });
    expect(carlos.props.accessibilityState).toMatchObject({ selected: false });
    expect(screen.getByRole(RAIL_TAB_ROLE, { name: 'Família' }).props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByRole(RAIL_TAB_ROLE, { name: 'Lia, 4 documentos' })).toBeTruthy();
    expect(screen.getByRole(RAIL_TAB_ROLE, { name: 'Ana, 0 documentos' })).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
    await fireEvent.press(carlos);
    expect(onSelect).toHaveBeenCalledWith('carlos');
    await fireEvent.press(screen.getByRole(RAIL_TAB_ROLE, { name: 'Família' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('a aba atual é a própria divisória; as outras na cor de cada pessoa; toque ≥ 44 pt', async () => {
    mockFontScale(1);
    await renderWithTheme(<TabRail items={items} onSelect={() => {}} />);
    const theme = createTheme('light');
    const fam = screen.getByTestId('tab-family');
    expect(flat(fam)).toMatchObject({ backgroundColor: theme.hues.family.board, height: 74, width: 40, borderTopRightRadius: 0 });
    const carlos = screen.getByTestId('tab-carlos');
    // Todas as abas têm 40 pt; a não selecionada fica 5 pt recolhida atrás da folha (só transform, nada se reorganiza).
    expect(flat(carlos)).toMatchObject({ backgroundColor: theme.hues.byName.cromo.tab, height: 86, width: 40 });
    const slop = carlos.props.hitSlop as { left: number; right: number };
    expect(35 + slop.left + slop.right).toBeGreaterThanOrEqual(44);
  });

  it('com texto ≥ 1,35× vira faixa horizontal no topo', async () => {
    mockFontScale(1.4);
    await renderWithTheme(
      withSafeArea(
        <DividerBoard hue="ultramar" testID="board" rail={<TabRail items={items} onSelect={() => {}} />}>
          <RNText>folha</RNText>
        </DividerBoard>,
      ),
    );
    expect(flat(screen.getByTestId('board')).flexDirection).toBe('column');
    expect(screen.getByLabelText('Divisórias da pasta').props.horizontal).toBe(true);
  });
});

describe('TabMark, StateLine, AttentionList, ListSection', () => {
  it('TabMark na cor da pessoa, decorativa', async () => {
    await renderWithTheme(<TabMark id="m-carlos" testID="mark" />);
    const mark = screen.getByTestId('mark', H);
    expect(flat(mark).backgroundColor).toBe(createTheme('light').personBoard(categoricalIndexFor('m-carlos')).tab);
    expect(mark.props.accessibilityElementsHidden).toBe(true);
  });

  it('StateLine: ícone + valor + estado numa frase, sem "normal"', async () => {
    await renderWithTheme(
      <>
        <StateLine state="high" value="138 mg/dL" testID="a" />
        <StateLine state="in" testID="b" />
        <StateLine icon="clock" text="Atrasada pelo calendário desde então" testID="c" />
      </>,
    );
    expect(screen.getByTestId('a').props.accessibilityLabel).toBe('138 mg/dL, acima da faixa do laudo');
    expect(screen.getByTestId('b').props.accessibilityLabel).toBe('Dentro da faixa do laudo');
    expect(screen.getByTestId('c').props.accessibilityLabel).toBe('Atrasada pelo calendário desde então');
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/normal/i);
  });

  it('AttentionList: marca da pessoa, data e estado; lê numa frase', async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <AttentionList
        items={[{ id: 'g', icon: 'stateHigh', tone: 'high', title: 'Carlos · Glicose em jejum', meta: '12 de out.', detail: '138 mg/dL, acima da faixa do laudo', personId: 'm-carlos', onPress }]}
      />,
    );
    const row = screen.getByRole('button', { name: 'Carlos, Glicose em jejum, 12 de out., 138 mg/dL, acima da faixa do laudo' });
    await fireEvent.press(row);
    expect(onPress).toHaveBeenCalled();
  });

  it('ListSection: sem cartão (sem fundo, raio nem borda), fio fino embaixo de cada linha', async () => {
    await renderWithTheme(
      <ListSection testID="ls">
        <ListItem title="Ana Souza" />
        <ListItem title="Carlos Souza" />
      </ListSection>,
    );
    const root = screen.getByTestId('ls');
    const group = root.children[0] as unknown as { props: { style?: unknown }; children: unknown[] };
    const g = flat(group);
    expect(g.backgroundColor).toBeUndefined();
    expect(g.borderRadius).toBeUndefined();
    expect(g.borderWidth).toBeUndefined();
    expect(group.children).toHaveLength(4);
  });
});

describe('Catálogo v4', () => {
  it('a primeira tela casa com o esboço: Família Souza, Para acompanhar, Pessoas e a régua', async () => {
    await renderWithTheme(withSafeArea(<Catalog screen="home" />));
    expect(screen.getByRole('header', { name: 'Família Souza' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Para acompanhar' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Pessoas' })).toBeTruthy();
    expect(screen.getByRole(RAIL_TAB_ROLE, { name: 'Carlos, 6 documentos' })).toBeTruthy();
  });

  it('os 8 matizes nos dois temas', async () => {
    await renderWithTheme(withSafeArea(<Catalog screen="boards" />));
    expect(screen.getAllByText('Ultramar')).toHaveLength(2);
    expect(screen.getAllByText('Oliva')).toHaveLength(2);
  });
});

describe('revisão final: legenda, fio de seção, ícone que cresce com o texto, menu do Android', () => {
  const POINTS = ['2025-03-10', '2025-09-10', '2026-03-10', '2026-10-12'].map((date, i) => ({
    date,
    label: date.slice(0, 7),
    value: 6.8 + i * 0.2,
    state: 'high' as const,
    range: { high: 5.7 },
  }));

  it('TrendChart: a legenda mostra a forma do estado vazada e explica que o cheio é o último resultado', async () => {
    await renderWithTheme(<TrendChart points={POINTS} unit="%" summary="HbA1c: 4 resultados." testID="tc" />);
    expect(screen.getByText('Acima da faixa', H)).toBeTruthy();
    expect(screen.getByText(TREND_LAST_LEGEND, H)).toBeTruthy();
    // Só uma entrada por estado + a do último: nada de "cheio = acima" sugerindo que os vazados estão dentro.
    expect(screen.queryByText('Dentro da faixa', H)).toBeNull();
    expect(screen.getByTestId('tc-legend-last', H)).toBeTruthy();
  });

  it('SectionHeader: fio fino ao lado do título', async () => {
    await renderWithTheme(<SectionHeader title="Pessoas" testID="sh" />);
    const rule = flat(screen.getByTestId('sh-rule'));
    expect(rule).toMatchObject({ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: createTheme('light').colors.border });
  });

  it('SectionHeader em AX3+: o título empilha e o fio sai', async () => {
    mockFontScale(2.4);
    await renderWithTheme(<SectionHeader title="Pessoas" testID="sh" />);
    expect(screen.getByRole('header', { name: 'Pessoas' })).toBeTruthy();
    expect(screen.queryByTestId('sh-rule')).toBeNull();
  });

  it('ícone de estado cresce com o texto do sistema, com teto de 2×', async () => {
    for (const [scale, want] of [[1, 1], [1.5, 1.5], [3.1, ICON_FONT_SCALE_CAP]] as const) {
      mockFontScale(scale);
      const { result } = await renderHook(() => useIconScale());
      expect(result.current).toBe(want);
    }
  });

  it('StateLine em AX5: o ícone (18 pt) dobra junto com o corpo', async () => {
    mockFontScale(3.1);
    await renderWithTheme(<StateLine state="high" value="138 mg/dL" testID="a" />);
    expect(JSON.stringify(screen.toJSON())).toContain('"size":36');
  });

  it('TOOLBAR_ICONS.more: reticências no iOS e Material Symbol XML no Android', () => {
    /* eslint-disable @typescript-eslint/no-require-imports -- o módulo lê Platform.OS na carga: só require isolado troca a plataforma */
    jest.isolateModules(() => {
      expect(require('../navigation/toolbarIcons').TOOLBAR_ICONS.more).toBe('ellipsis');
    });
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
      const icons = require('../navigation/toolbarIcons').TOOLBAR_ICONS;
      expect(icons.more).not.toBe('ellipsis');
      expect(icons.more).toBeTruthy();
    });
    /* eslint-enable @typescript-eslint/no-require-imports */
  });
});
