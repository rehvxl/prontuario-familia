import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, StyleSheet } from 'react-native';
import { createTheme, headerOptions, ThemeProvider } from '../theme';
import { Catalog } from '../__catalog__/Catalog';
import { renderWithTheme } from '../test-utils';
import { AttentionList } from './AttentionList';
import { categoricalIndexFor } from '../lib/identity';
import { Avatar } from './Avatar';
import { Card } from './Card';
import { MetricValue, metricAccessibilityLabel } from './MetricValue';
import { ProgressSteps } from './ProgressSteps';
import { RangeBar, rangeBarGeometry } from './RangeBar';
import { Screen } from './Screen';
import { SectionHeader } from './SectionHeader';
import { Sparkline } from './Sparkline';
import { StateChip } from './StateChip';
import { SuggestedField, suggestedFieldLabel } from './SuggestedField';
import { niceScale, sharedBand, TREND_SINGLE_POINT_TEXT, TrendChart, type TrendPoint } from './TrendChart';
import { Text } from './Text';

const flat = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;
const near = (got: number, want: number) => expect(got).toBeCloseTo(want, 4);
const H = { includeHiddenElements: true };

describe('rangeBarGeometry (régua do laudo)', () => {
  it('faixa fechada: ± 60% da largura (TSH 3,1 com 0,4–4, igual ao protótipo)', () => {
    const g = rangeBarGeometry(3.1, { low: 0.4, high: 4 })!;
    near(g.band.start, 0.272727);
    near(g.band.end - g.band.start, 0.454545);
    near(g.marker, 0.613636);
    near(g.origin, 0.5);
  });

  it('faixa aberta embaixo vai até a borda (HbA1c 7,4 com "< 5,7", igual ao protótipo)', () => {
    const g = rangeBarGeometry(7.4, { high: 5.7 })!;
    expect(g.band.start).toBe(0);
    near(g.band.end, 0.5);
    near(g.marker, 0.831384);
  });

  it('faixa aberta em cima vai até a borda (HDL 38 com "> 40")', () => {
    const g = rangeBarGeometry(38, { low: 40 })!;
    expect(g.band.end).toBe(1);
    expect(g.marker).toBeLessThan(g.band.start);
  });

  it('valor no limite fica na borda da faixa (99 com 70–99)', () => {
    const g = rangeBarGeometry(99, { low: 70, high: 99 })!;
    near(g.marker, g.band.end);
  });

  it('valor fora do domínio amplia com 8% de folga e não sai da régua', () => {
    const g = rangeBarGeometry(140, { low: 70, high: 99 })!;
    near(g.marker, 1 / 1.08);
    expect(g.band.end).toBeLessThan(g.marker);
  });

  it('valor muito distante encosta na borda (domínio amplia no máximo 3×)', () => {
    expect(rangeBarGeometry(10_000, { low: 70, high: 99 })!.marker).toBe(1);
    expect(rangeBarGeometry(-10_000, { low: 70, high: 99 })!.marker).toBe(0);
  });

  it('sem faixa numérica (só texto) não há geometria', () => {
    expect(rangeBarGeometry(120, { text: 'Desejável: < 100' })).toBeNull();
    expect(rangeBarGeometry(120, {})).toBeNull();
  });
});

describe('RangeBar', () => {
  it('é decorativa para o leitor de tela e posiciona o marcador no valor (Reduzir movimento)', async () => {
    await renderWithTheme(<RangeBar value={3.1} range={{ low: 0.4, high: 4 }} state="in" testID="rb" />);
    const box = screen.getByTestId('rb', H);
    expect(box.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(box.props.accessibilityElementsHidden).toBe(true);
    expect(flat(box).width).toBe(112);
    expect(flat(screen.getByTestId('rb-band', H)).left).toBe('27.273%');
    const marker = flat(screen.getByTestId('rb-marker', H));
    expect(marker.left).toBe('61.364%');
    // v4: marcador na tinta da divisória (família = ultramar); o estado é dito em texto.
    expect(marker.backgroundColor).toBe(createTheme('light').colors.primary);
  });

  it('marcador sai do centro da faixa e assenta no valor em 300 ms (sem Reduzir movimento)', async () => {
    jest.useFakeTimers();
    await render(
      <ThemeProvider scheme="light" reducedMotion={false}>
        <RangeBar value={3.1} range={{ low: 0.4, high: 4 }} state="high" width="fill" testID="rb" />
      </ThemeProvider>,
    );
    const left = () => Number.parseFloat(String(flat(screen.getByTestId('rb-marker', H)).left));
    near(left(), 50);
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(left()).toBeCloseTo(61.364, 2);
    expect(flat(screen.getByTestId('rb', H)).alignSelf).toBe('stretch');
    jest.useRealTimers();
  });

  it('sem faixa numérica: trilho tracejado e nenhum marcador', async () => {
    await renderWithTheme(<RangeBar value={120} range={{ text: 'Desejável: < 100' }} state="none" testID="rb" />);
    expect(screen.queryByTestId('rb-marker', H)).toBeNull();
    expect(JSON.stringify(screen.toJSON())).toContain('strokeDasharray');
  });
});

describe('MetricValue', () => {
  it('um elemento só, com a unidade por extenso e o estado em texto', async () => {
    await renderWithTheme(<MetricValue value="7,4" unit="%" unitSpoken="por cento" state="high" size="hero" testID="mv" />);
    expect(screen.getByTestId('mv').props.accessibilityLabel).toBe('7,4 por cento, acima da faixa do laudo');
    expect(screen.getByText('7,4')).toBeTruthy();
    expect(screen.getByText('%')).toBeTruthy();
    // hero mostra o estado com o texto da A2.
    expect(screen.getByText('Acima da faixa do laudo')).toBeTruthy();
  });

  it('sem unitSpoken lê a unidade como escrita; pressão lê "por"', () => {
    expect(metricAccessibilityLabel({ value: '99', unit: 'mg/dL', state: 'in' })).toBe('99 mg/dL, dentro da faixa do laudo');
    expect(metricAccessibilityLabel({ value: '142', value2: '88', unit: 'mmHg', unitSpoken: 'milímetros de mercúrio' })).toBe(
      '142 por 88 milímetros de mercúrio',
    );
  });

  it('em linha não mostra o chip por padrão; valor e unidade em textos separados, número tabular', async () => {
    await renderWithTheme(<MetricValue value="142" value2="88" unit="mmHg" state="none" />);
    expect(screen.queryByText('Sem faixa')).toBeNull();
    const number = screen.getByText('142/88');
    expect(flat(number).fontVariant).toEqual(['tabular-nums']);
    expect(screen.getByText('mmHg')).toBeTruthy();
  });
});

describe('StateChip', () => {
  it.each([
    ['in', 'Dentro da faixa', 'Dentro da faixa do laudo'],
    ['high', 'Acima da faixa', 'Acima da faixa do laudo'],
    ['low', 'Abaixo da faixa', 'Abaixo da faixa do laudo'],
    ['none', 'Sem faixa', 'Sem faixa no laudo'],
  ] as const)('%s: texto curto visível e o longo para o leitor', async (state, short, long) => {
    await renderWithTheme(<StateChip state={state} testID="chip" />);
    expect(screen.getByText(short)).toBeTruthy();
    expect(screen.getByTestId('chip').props.accessibilityLabel).toBe(long);
  });
});

const HBA1C: TrendPoint[] = [
  { date: '2025-03-10', label: 'mar./25', value: 7.9, state: 'high', range: { high: 5.7, text: 'inferior a 5,7' } },
  { date: '2025-11-02', label: 'nov./25', value: 7.1, state: 'high', range: { high: 5.7, text: 'inferior a 5,7' } },
  { date: '2026-10-28', label: 'out./26', value: 7.4, state: 'high', range: { high: 5.7, text: 'inferior a 5,7' } },
];
const SUMMARY = 'Hemoglobina glicada: 3 resultados de março de 2025 a outubro de 2026. Último: 7,4 %, acima da faixa do laudo.';

describe('TrendChart', () => {
  it('o resumo é visível e é o rótulo da imagem do gráfico', async () => {
    await renderWithTheme(<TrendChart points={HBA1C} unit="%" summary={SUMMARY} testID="tc" />);
    const chart = screen.getByTestId('tc-chart');
    expect(chart.props.accessibilityRole).toBe('image');
    expect(chart.props.accessibilityLabel).toBe(SUMMARY);
    expect(screen.getByText(SUMMARY, H)).toBeTruthy();
  });

  it('desenha banda, linha e o último valor depois de medir a largura; toque no ponto devolve o índice', async () => {
    const onPointPress = jest.fn();
    await renderWithTheme(<TrendChart points={HBA1C} unit="%" summary={SUMMARY} onPointPress={onPointPress} testID="tc" />);
    await fireEvent(screen.getByTestId('tc-chart'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 326, height: 196 } } });
    const tree = JSON.stringify(screen.toJSON());
    expect(tree).toContain('faixa do laudo: inferior a 5,7');
    expect(tree).toContain('7,4 %');
    await fireEvent.press(screen.getByTestId('tc-point-2'));
    expect(onPointPress).toHaveBeenCalledWith(2);
  });

  it('com 1 ponto não há gráfico: mostra o texto da spec e o resumo legível', async () => {
    await renderWithTheme(<TrendChart points={HBA1C.slice(0, 1)} unit="%" summary="Hemoglobina glicada: 1 resultado." testID="tc" />);
    expect(screen.getByText(TREND_SINGLE_POINT_TEXT)).toBeTruthy();
    expect(screen.queryByTestId('tc-chart')).toBeNull();
    expect(screen.getByText('Hemoglobina glicada: 1 resultado.').props.importantForAccessibility).toBe('auto');
  });

  it('banda só quando todos os pontos têm a mesma faixa numérica (R4)', () => {
    expect(sharedBand(HBA1C)).toEqual({ high: 5.7, text: 'inferior a 5,7' });
    expect(sharedBand([HBA1C[0]!, { ...HBA1C[1]!, range: { high: 6 } }])).toBeNull();
    expect(sharedBand([HBA1C[0]!, { ...HBA1C[1]!, range: undefined }])).toBeNull();
    expect(sharedBand(HBA1C.map((p) => ({ ...p, range: { text: 'Desejável: < 100' } })))).toBeNull();
  });

  it('eixo com marcas redondas que cobrem os valores', () => {
    expect(niceScale(5.7, 7.9)).toEqual({ min: 5, max: 8, ticks: [5, 6, 7, 8], digits: 0 });
    expect(niceScale(0.4, 1.1)).toMatchObject({ ticks: [0.25, 0.5, 0.75, 1, 1.25], digits: 2 });
    const s = niceScale(150_000, 410_000);
    expect(s.min).toBeLessThanOrEqual(150_000);
    expect(s.max).toBeGreaterThanOrEqual(410_000);
    expect(s.digits).toBe(0);
    expect(niceScale(5, 5).ticks.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Sparkline', () => {
  it('é uma imagem com o resumo como rótulo', async () => {
    const summary = '3 medições em 30 dias, de 136/84 a 145/90; última 142/88';
    await renderWithTheme(<Sparkline series={[[136, 145, 142], [84, 90, 88]]} summary={summary} testID="sp" />);
    expect(screen.getByTestId('sp').props.accessibilityLabel).toBe(summary);
    expect(screen.getByTestId('sp').props.accessibilityRole).toBe('image');
  });
});

describe('AttentionList', () => {
  const items = Array.from({ length: 7 }, (_, i) => ({
    id: `a${i}`,
    icon: 'stateHigh' as const,
    tone: 'high' as const,
    title: `Carlos · Exame ${i + 1}`,
    detail: 'Acima da faixa do laudo · 7,4 % · 28 de out.',
    onPress: jest.fn(),
  }));

  it('mostra até 5, na ordem recebida, e "Ver todos ({n})"', async () => {
    const onSeeAll = jest.fn();
    await renderWithTheme(<AttentionList items={items} onSeeAll={onSeeAll} footer="Vacinas: 2 de 3 pessoas em dia com o calendário." />);
    expect(screen.getByText('Carlos · Exame 5')).toBeTruthy();
    expect(screen.queryByText('Carlos · Exame 6')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Carlos, Exame 1, Acima da faixa do laudo, 7,4 %, 28 de out.' }));
    expect(items[0]!.onPress).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Ver todos (7)' }));
    expect(onSeeAll).toHaveBeenCalled();
  });

  it('vazio sem texto não renderiza; com texto mostra a frase', async () => {
    const { toJSON } = await renderWithTheme(<AttentionList items={[]} />);
    expect(toJSON()).toBeNull();
    await renderWithTheme(<AttentionList items={[]} emptyText="Nada pendente pelo que está registrado no app." />);
    expect(screen.getByText('Nada pendente pelo que está registrado no app.')).toBeTruthy();
  });
});

describe('SuggestedField', () => {
  it('sugestão da leitura: selo, medidor em palavras e o trecho lido', async () => {
    await renderWithTheme(
      <SuggestedField label="Profissional" value="Dra. Paula Lima" onChange={() => {}} origin="ocr" confidence="low" sourceHint="Dra. Paula Lima CRM 12345" />,
    );
    expect(screen.getByText('Sugestão', H)).toBeTruthy();
    expect(screen.getByText('Confira', H)).toBeTruthy();
    expect(screen.getByText('“Dra. Paula Lima CRM 12345”')).toBeTruthy();
    expect(screen.getByLabelText('Profissional, Dra. Paula Lima, sugestão da leitura, confiança baixa, confira')).toBeTruthy();
  });

  it('editar abre o campo e devolve o texto; origem da pessoa não tem selo', async () => {
    const onChange = jest.fn();
    await renderWithTheme(<SuggestedField label="Local" value="Laboratório Vida" onChange={onChange} origin="user" />);
    expect(screen.queryByText('Sugestão', H)).toBeNull();
    expect(screen.getByText('Escolhida por você')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Editar' }));
    await fireEvent.changeText(screen.getByLabelText('Local'), 'Clínica Viver');
    expect(onChange).toHaveBeenCalledWith('Clínica Viver');
    expect(suggestedFieldLabel({ label: 'Data', value: '', origin: 'ocr', required: true })).toBe('Data, vazio, obrigatório, sugestão da leitura');
  });
});

describe('ProgressSteps', () => {
  it('é uma barra de progresso com valor e anúncio educado', async () => {
    await renderWithTheme(<ProgressSteps progress={0.5} label="1 de 2" testID="p" />);
    const bar = screen.getByTestId('p');
    expect(bar.props.accessibilityRole).toBe('progressbar');
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 50 });
    expect(bar.props.accessibilityLiveRegion).toBe('polite');
  });
});

describe('Alterações v3 nos existentes', () => {
  it('SectionHeader é cabeçalho (Archivo Bold, sem serifa) com ação', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<SectionHeader title="Exames recentes" action={{ label: 'Ver tudo', onPress }} />);
    const header = screen.getByRole('header', { name: 'Exames recentes' });
    expect(flat(header).fontFamily).toBe('ArchivoSC-Bold');
    await fireEvent.press(screen.getByRole('button', { name: 'Ver tudo' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('Screen heading desenha o título no conteúdo', async () => {
    await renderWithTheme(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 393, height: 852 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
        <Screen heading={{ title: 'Família Souza', subtitle: 'Quarta-feira, 11 de novembro de 2026' }}>
          <Text>Conteúdo</Text>
        </Screen>
      </SafeAreaProvider>,
    );
    expect(screen.getByRole('header', { name: 'Família Souza' })).toBeTruthy();
    expect(screen.getByText('Quarta-feira, 11 de novembro de 2026')).toBeTruthy();
  });

  it('headerOptions com contentTitle: sem título grande, transparente, sem texto de título, fundo da folha', () => {
    const theme = createTheme('light');
    expect(Platform.OS).toBe('ios');
    expect(headerOptions(theme, { contentTitle: true })).toMatchObject({ headerLargeTitle: false, headerTransparent: true, headerTitle: '' });
    expect(headerOptions(theme).contentStyle).toEqual({ backgroundColor: '#F3F4F8' });
    expect(theme.native.groupedBackground).toBe('#F3F4F8');
  });

  it('Card sem pílula de acento: `accent` vira no-op e o cartão tem fio, sem sombra', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await renderWithTheme(
      <Card accent={2} testID="c">
        <Text>Hemograma</Text>
      </Card>,
    );
    const card = screen.getByTestId('c');
    expect(card.children).toHaveLength(1);
    expect(flat(card)).toMatchObject({ borderWidth: 1, borderRadius: 16, backgroundColor: '#FBFBFD' });
    expect(flat(card).boxShadow).toBeUndefined();
    warn.mockRestore();
  });

  it('Card tinted usa surfaceTinted (v4: igual a surface, sem tom de destaque)', async () => {
    await renderWithTheme(
      <Card tone="tinted" testID="c">
        <Text>Agora</Text>
      </Card>,
    );
    expect(flat(screen.getByTestId('c')).backgroundColor).toBe(createTheme('light').colors.surfaceTinted);
  });

  it('Avatar v4: capa na cor plena da pessoa, iniciais em onBoard; `ring` aceito e ignorado', async () => {
    await renderWithTheme(<Avatar name="Carlos Souza" id="m-carlos" ring size="xs" testID="av" />);
    const theme = createTheme('light');
    const av = screen.getByTestId('av', H);
    const hue = theme.personBoard(categoricalIndexFor('m-carlos'));
    expect(flat(av).backgroundColor).toBe(hue.board);
    expect(flat(screen.getByText('CS', H)).color).toBe(hue.onBoard);
    expect(flat(av).width).toBe(24);
    expect(JSON.stringify(screen.toJSON())).not.toContain('"borderWidth":1.5');
  });
});

describe('Catálogo v3', () => {
  it('a tela clínica mostra os 4 estados nos dois temas', async () => {
    await render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 393, height: 852 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
        <ThemeProvider scheme="light" reducedMotion>
          <Catalog screen="clinical" />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(screen.getByRole('header', { name: 'Claro' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Escuro' })).toBeTruthy();
    for (const label of ['Dentro da faixa do laudo', 'Acima da faixa do laudo', 'Abaixo da faixa do laudo', 'Sem faixa no laudo']) {
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(2);
    }
  });
});
