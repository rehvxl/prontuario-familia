import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { AttentionItem, FamilyAttention } from '@/features/health-overview';
import { ThemeProvider } from '@/shared/ui';
import { FamilyAttentionCard, FamilyAttentionNotices, attentionFooter, present } from './FamilyAttentionCard';

const mockAttention = jest.fn();
jest.mock('@/features/health-overview', () => ({ useFamilyAttention: () => mockAttention() }));

const A1 = 'A faixa de referência é a impressa no laudo. Só o profissional de saúde pode interpretar o resultado.';
const A3 = 'Referência do calendário público. Confirme com o profissional de saúde.';
const A13 = 'As pendências consideram só as doses registradas no app.';
const TODAY = '2026-11-11';
const VETOED = /\b(normal|anormal|alterad[oa]s?|grave|crítico|risco|perigo|alerta|urgente|preocupante|saudável|doente|bom|ruim)\b|!/i;

const activate = (el: Parameters<typeof fireEvent>[0]) => fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

const vaccines = (memberId: string) => ({ screen: 'vaccines' as const, memberId });
const item = (over: Partial<AttentionItem> & Pick<AttentionItem, 'id' | 'kind' | 'title' | 'detail'>): AttentionItem => ({
  memberId: 'm', date: '2026-10-10', target: vaccines('m'), ...over,
});

// Títulos e detalhes no formato do domínio (buildFamilyAttention). Ordem do domínio (F7.2): atrasadas, fora da faixa, pendentes, próximas. As pessoas se alternam (S9).
const ITEMS: AttentionItem[] = [
  item({ id: '1', kind: 'vaccine-late', memberId: 'lia', title: 'Lia · Febre amarela (1ª dose)', detail: 'Atrasada pelo calendário · a partir de 10 de out. de 2026', target: vaccines('lia') }),
  item({
    id: '2', kind: 'lab-out-of-range', memberId: 'carlos', date: '2026-10-12',
    title: 'Carlos · Hemoglobina glicada (HbA1c)', detail: 'Acima da faixa do laudo · 7,4 % · 12 de out.',
    target: { screen: 'exam-series', memberId: 'carlos', seriesKey: 'hba1c' },
  }),
  item({
    id: '3', kind: 'lab-out-of-range', memberId: 'lia', date: '2026-10-22',
    title: 'Lia · Ferritina', detail: 'Abaixo da faixa do laudo · 18 ng/mL · 22 de out.',
    target: { screen: 'exam-series', memberId: 'lia', seriesKey: 'ferritin' },
  }),
  item({ id: '4', kind: 'vaccine-due', memberId: 'dirce', title: 'Dirce · Influenza de 2026', detail: 'Pendente · a partir de 1 de jan. de 2026', target: vaccines('dirce') }),
  item({ id: '5', kind: 'vaccine-due', memberId: 'carlos', title: 'Carlos · Dupla adulto (dT, 3 doses)', detail: 'Confirmar na carteira' }),
  item({ id: '6', kind: 'vaccine-due', memberId: 'dirce', title: 'Dirce · Hepatite B (3 doses)', detail: 'Confirmar na carteira' }),
  item({ id: '7', kind: 'vaccine-next', memberId: 'lia', title: 'Lia · Tríplice viral (SCR, 1ª dose)', detail: 'Próxima · a partir de 10 de jan. de 2027' }),
];

const attention = (over: Partial<FamilyAttention> = {}): FamilyAttention => ({
  hasHealthData: true,
  items: ITEMS,
  vaccines: { upToDate: 2, total: 4, withoutBirthDate: 1 },
  ...over,
});

function setQuery(state: { data?: FamilyAttention; isError?: boolean; refetch?: jest.Mock }) {
  mockAttention.mockReturnValue({ data: state.data, isSuccess: !!state.data, isError: !!state.isError, refetch: state.refetch ?? jest.fn() });
}

const onOpen = jest.fn();
const renderCard = () =>
  render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
      <ThemeProvider scheme="light" reducedMotion>
        <FamilyAttentionCard familyId="f1" onOpen={onOpen} />
        <FamilyAttentionNotices familyId="f1" />
      </ThemeProvider>
    </SafeAreaProvider>,
  );

/** Todo texto e rótulo de acessibilidade da árvore, para a revisão de copy (métrica "Calma"). */
function allCopy(): string[] {
  const out: string[] = [];
  const walk = (n: unknown) => {
    if (typeof n === 'string') out.push(n);
    else if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === 'object') {
      const node = n as { props?: { accessibilityLabel?: string }; children?: unknown };
      if (node.props?.accessibilityLabel) out.push(node.props.accessibilityLabel);
      walk(node.children);
    }
  };
  walk(screen.toJSON());
  return out;
}

// Hoje = 11/11/2026 (o ano corrente sai das datas das vacinas). Só o Date é falso.
beforeAll(() => {
  jest.useFakeTimers({
    now: new Date(2026, 10, 11, 9, 0),
    doNotFake: ['hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
  });
});
afterAll(() => jest.useRealTimers());
beforeEach(() => jest.clearAllMocks());

/** O título como aparece na folha (o exame sem a sigla entre parênteses). */
const shown = (i: AttentionItem) => present(i, TODAY).title;

describe('FamilyAttentionCard (spec F7)', () => {
  it('F7.1: mostra até 5 itens e "Ver todos (n)"; "Ver todos" abre a lista completa', async () => {
    setQuery({ data: attention() });
    await renderCard();
    expect(screen.getByText('Para acompanhar')).toBeOnTheScreen();
    for (const i of ITEMS.slice(0, 5)) expect(screen.getByText(shown(i))).toBeOnTheScreen();
    expect(screen.queryByText(shown(ITEMS[5]!))).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Ver todos (7)' }));
    for (const i of ITEMS) expect(screen.getByText(shown(i))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Ver todos/ })).toBeNull();
  });

  it('F7.2: mantém a ordem do domínio, sem reagrupar por pessoa', async () => {
    setQuery({ data: attention() });
    await renderCard();
    await fireEvent.press(screen.getByRole('button', { name: 'Ver todos (7)' }));
    const titles = allCopy().filter((t) => ITEMS.some((i) => shown(i) === t));
    expect(titles).toEqual(ITEMS.map(shown));
  });

  it('F7.3: cada item é um botão "{nome} · {o quê}" com o estado em texto; tocar abre a carteira ou a série', async () => {
    setQuery({ data: attention() });
    await renderCard();
    const lab = screen.getByRole('button', {
      name: 'Carlos, Hemoglobina glicada, 12 de out., 7,4 %, acima da faixa do laudo',
    });
    await fireEvent.press(lab);
    expect(onOpen).toHaveBeenLastCalledWith({ screen: 'exam-series', memberId: 'carlos', seriesKey: 'hba1c' });

    await fireEvent.press(screen.getByRole('button', { name: 'Dirce, Influenza de 2026, Pendente, a partir de 1 de jan.' }));
    expect(onOpen).toHaveBeenLastCalledWith({ screen: 'vaccines', memberId: 'dirce' });
    expect(screen.getByText('Lia · Febre amarela (1ª dose)')).toBeOnTheScreen();
  });

  it('v4: valor e estado numa frase, a data à direita; vacina com a data no texto, sem o ano corrente (nunca só cor)', async () => {
    setQuery({ data: attention() });
    await renderCard();
    expect(screen.getByText('7,4 %, acima da faixa do laudo')).toBeOnTheScreen();
    expect(screen.getByText('18 ng/mL, abaixo da faixa do laudo')).toBeOnTheScreen();
    expect(screen.getAllByText('12 de out.').length).toBeGreaterThan(0);
    expect(screen.getByText('Carlos · Hemoglobina glicada')).toBeOnTheScreen();
    expect(screen.getByText('Atrasada desde 10 de out.')).toBeOnTheScreen();
    expect(screen.getByText('Pendente, a partir de 1 de jan.')).toBeOnTheScreen();
  });

  it('F7.4: linha coletiva das vacinas, com quem não tem data de nascimento, e os avisos A3 e A1 num só parágrafo à parte', async () => {
    setQuery({ data: attention() });
    await renderCard();
    expect(screen.getByTestId('family-vaccines-line')).toHaveAccessibleName('Vacinas: 2 de 4 pessoas em dia com o calendário, 1 sem data de nascimento.');
    expect(screen.getByTestId('family-attention-notices')).toHaveTextContent(`${A3} ${A1}`);
    // Os avisos não ficam dentro do cartão: a tela os põe abaixo das pessoas.
    expect(screen.getByTestId('family-attention')).not.toHaveTextContent(A1, { exact: false });
  });

  it('F7.5: sem item, diz "Nada pendente pelo que está registrado no app." com a A13', async () => {
    setQuery({ data: attention({ items: [], vaccines: { upToDate: 3, total: 3, withoutBirthDate: 0 } }) });
    await renderCard();
    expect(screen.getByText('Nada pendente pelo que está registrado no app.')).toBeOnTheScreen();
    expect(screen.getByText('Vacinas: 3 de 3 pessoas em dia com o calendário.')).toBeOnTheScreen();
    expect(screen.getByText(A13)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Ver todos/ })).toBeNull();
  });

  it('F7.6: família sem nenhum dado de saúde não mostra o cartão', async () => {
    setQuery({ data: attention({ hasHealthData: false, items: [] }) });
    await renderCard();
    expect(screen.queryByTestId('family-attention')).toBeNull();
    expect(screen.queryByTestId('family-attention-notices')).toBeNull();
    expect(screen.queryByText('Para acompanhar')).toBeNull();
  });

  it('carregando: esqueleto do cartão com "Carregando" para o leitor de tela', async () => {
    setQuery({});
    await renderCard();
    expect(screen.getByText('Para acompanhar')).toBeOnTheScreen();
    expect(screen.getByLabelText('Carregando')).toBeOnTheScreen();
  });

  it('erro: "Não foi possível montar o resumo da família." e "Tentar de novo" refaz a consulta', async () => {
    const refetch = jest.fn();
    setQuery({ isError: true, refetch });
    await renderCard();
    expect(screen.getByText('Não foi possível montar o resumo da família.')).toBeOnTheScreen();
    await activate(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(refetch).toHaveBeenCalled();
  });

  it.each([
    ['com itens', { data: attention() }],
    ['vazio', { data: attention({ items: [] }) }],
    ['carregando', {}],
    ['erro', { isError: true }],
  ])('Calma (%s): nenhuma palavra vetada nem exclamação (spec §3.2)', async (_, state) => {
    setQuery(state);
    await renderCard();
    for (const text of allCopy()) expect(text).not.toMatch(VETOED);
  });
});

describe('present (linha v4)', () => {
  it('exame: ícone da direção, "valor, estado" e a data como meta; sem o formato esperado, mantém o detalhe', () => {
    expect(present(ITEMS[1]!, TODAY)).toEqual({
      icon: 'stateHigh', tone: 'high', title: 'Carlos · Hemoglobina glicada', detail: '7,4 %, acima da faixa do laudo', meta: '12 de out.',
    });
    expect(present(ITEMS[2]!, TODAY)).toMatchObject({ icon: 'stateLow', title: 'Lia · Ferritina', detail: '18 ng/mL, abaixo da faixa do laudo' });
    expect(present(item({ id: 'x', kind: 'lab-out-of-range', title: 't', detail: 'Acima da faixa do laudo' }), TODAY).detail).toBe('Acima da faixa do laudo');
  });

  it('vacina: relógio só para atrasada, calendário para as demais', () => {
    expect(present(ITEMS[0]!, TODAY).icon).toBe('clock');
    expect(present(ITEMS[3]!, TODAY)).toEqual({ icon: 'calendar', tone: 'care', title: 'Dirce · Influenza de 2026', detail: 'Pendente, a partir de 1 de jan.' });
  });

  it('vacina: estado numa linha; a dose no título fica (só o exame perde a sigla); ano de outra data fica', () => {
    expect(present(ITEMS[0]!, TODAY)).toMatchObject({ title: 'Lia · Febre amarela (1ª dose)', detail: 'Atrasada desde 10 de out.' });
    expect(present(ITEMS[6]!, TODAY).detail).toBe('Próxima, a partir de 10 de jan. de 2027');
    expect(present(ITEMS[0]!, '2027-02-01').detail).toBe('Atrasada desde 10 de out. de 2026');
    expect(present(ITEMS[4]!, TODAY)).toMatchObject({ title: 'Carlos · Dupla adulto (dT, 3 doses)', detail: 'Confirmar na carteira' });
  });
});

describe('attentionFooter', () => {
  it('linha das vacinas + um único parágrafo de avisos (não três rodapés empilhados)', () => {
    const footer = attentionFooter(attention());
    expect(footer.split('\n')).toEqual(['Vacinas: 2 de 4 pessoas em dia com o calendário, 1 sem data de nascimento.', `${A3} ${A1}`]);
  });

  it('concorda "pessoa" no singular e só cita os avisos do que aparece', () => {
    const lab = ITEMS[1]!;
    expect(attentionFooter(attention({ items: [lab], vaccines: { upToDate: 0, total: 1, withoutBirthDate: 1 } }))).toBe(
      ['Vacinas: 0 de 1 pessoa em dia com o calendário, 1 sem data de nascimento.', A1].join('\n'),
    );
    expect(attentionFooter(attention({ items: [ITEMS[0]!] }))).toBe(
      ['Vacinas: 2 de 4 pessoas em dia com o calendário, 1 sem data de nascimento.', A3].join('\n'),
    );
  });
});
