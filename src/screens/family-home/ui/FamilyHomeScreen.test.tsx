import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { RAIL_TAB_ROLE , ThemeProvider } from '@/shared/ui';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DEPENDENCY_KEYS } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { createLocalHealthRecordRepository } from '@/entities/health-record';
import { createLocalMeasurementRepository } from '@/entities/measurement';
import { createLocalMedicationRepository } from '@/entities/medication';
import { createLocalMemberRepository, type NewMember } from '@/entities/member';
import { createLocalVaccineDoseRepository } from '@/entities/vaccine';
import { FamilyHomeScreen, familyTitle, todayHeading } from './FamilyHomeScreen';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn() };
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  useIsFocused: () => true,
  useFocusEffect: () => {},
}));
// Régua vertical na borda direita (o jest padrão usa fontScale 2, que vira faixa no topo).
let mockFontScale = 1;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: mockFontScale }),
}));

const A1 = 'A faixa de referência é a impressa no laudo. Só o profissional de saúde pode interpretar o resultado.';
const activate = (el: Parameters<typeof fireEvent>[0]) => fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

// Hoje = quarta-feira, 11/11/2026. Só o Date é falso: timers e microtarefas do React Query seguem reais.
beforeAll(() => {
  jest.useFakeTimers({
    now: new Date(2026, 10, 11, 9, 0),
    doNotFake: ['hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
  });
});
afterAll(() => jest.useRealTimers());
beforeEach(() => jest.clearAllMocks());

const hba1c = {
  kind: 'lab' as const, code: 'hba1c', label: 'Hemoglobina glicada', value: 7.4, value2: null, unit: '%',
  referenceLow: null, referenceHigh: 5.7, referenceText: 'Inferior a 5,7 %', takenOn: '2026-10-12', takenAt: null, context: null, note: null,
  familyId: 'f1', sourceRecordId: null, origin: 'manual' as const,
};

async function setup(people: Omit<NewMember, 'familyId'>[], over: { listMembers?: () => Promise<never> } = {}) {
  const db = createMemoryDb();
  const local = createLocalMemberRepository(db);
  const members = over.listMembers ? { ...local, listByFamily: over.listMembers } : local;
  const created = [];
  for (const p of people) created.push(await local.create({ ...p, familyId: 'f1' }));
  const records = createLocalHealthRecordRepository(db);
  const measurements = createLocalMeasurementRepository(db);
  const { wrapper: Deps } = renderWithDependencies({
    [DEPENDENCY_KEYS.families]: { getMyFamily: async () => ({ id: 'f1', name: 'Souza', createdAt: '2026-01-01T00:00:00Z', myRole: 'owner' }) },
    [DEPENDENCY_KEYS.members]: members,
    [DEPENDENCY_KEYS.records]: records,
    [DEPENDENCY_KEYS.measurements]: measurements,
    [DEPENDENCY_KEYS.vaccineDoses]: createLocalVaccineDoseRepository(db),
    [DEPENDENCY_KEYS.medications]: createLocalMedicationRepository(db),
  });
  const renderScreen = (demo = false) =>
    render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
        <ThemeProvider scheme="light" reducedMotion>
          <Deps>
            <FamilyHomeScreen demo={demo} />
          </Deps>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  return { members: created, records, measurements, renderScreen };
}

const ana: Omit<NewMember, 'familyId'> = { fullName: 'Ana Souza', birthDate: '1988-05-01', relationship: 'self', sex: 'female' };
// Sem data de nascimento, nenhuma regra vacinal é calculada (R13): o único item é o exame.
const bruno: Omit<NewMember, 'familyId'> = { fullName: 'Bruno Souza', birthDate: null, relationship: 'child', sex: 'male' };

/** Ordem de leitura: posição do texto na árvore renderizada. */
const order = (texts: string[]) => {
  const all = JSON.stringify(screen.toJSON());
  return texts.map((t) => all.indexOf(t));
};

describe('FamilyHomeScreen — painel da família (F7)', () => {
  it('título "Família <sobrenome>" e a data de hoje por extenso', async () => {
    const s = await setup([ana]);
    await s.renderScreen();
    expect(await screen.findByRole('header', { name: 'Família Souza' })).toBeOnTheScreen();
    expect(screen.getByText('Quarta-feira, 11 de novembro de 2026')).toBeOnTheScreen();
  });

  it('F7.6: sem nenhum dado de saúde, o cartão não aparece e a tela fica como no MVP', async () => {
    const s = await setup([ana]);
    await s.records.create({ familyId: 'f1', memberId: s.members[0]!.id, type: 'exam', title: 'Hemograma', date: '2026-03-10', location: null, professional: null, notes: null });
    await s.renderScreen();
    expect(await screen.findByText('Eu · 38 anos · 1 documento')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ana Souza, Eu, 38 anos, 1 documento' })).toBeOnTheScreen();
    expect(screen.queryByText('Para acompanhar')).toBeNull();
    expect(screen.getByText('Pessoas')).toBeOnTheScreen();
  });

  it('F7.1, F7.3, F7.4: "Para acompanhar" acima das pessoas; tocar no exame abre a série (1 toque até o gráfico)', async () => {
    const s = await setup([bruno]);
    const memberId = s.members[0]!.id;
    await s.measurements.createMany([{ ...hba1c, memberId }]);
    await s.renderScreen();

    const title = 'Bruno · Hemoglobina glicada';
    expect(await screen.findByText(title)).toBeOnTheScreen();
    expect(screen.getByText('7,4 %, acima da faixa do laudo')).toBeOnTheScreen();
    expect(screen.getByText('Vacinas: 0 de 1 pessoa em dia com o calendário, 1 sem data de nascimento.')).toBeOnTheScreen();
    expect(screen.getByText(A1)).toBeOnTheScreen();
    // Primeira tela: o que acompanhar, depois as pessoas e só então os avisos.
    const [card, people, person, notice] = order(['Para acompanhar', 'Pessoas', 'Bruno Souza', A1]);
    expect(card).toBeGreaterThan(-1);
    expect(card).toBeLessThan(people!);
    expect(people).toBeLessThan(person!);
    expect(person).toBeLessThan(notice!);
    // Parentesco pelo sexo informado, sem o neutro "Filho(a)".
    expect(screen.getByRole('button', { name: /^Bruno Souza, Filho\b/ })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Bruno, Hemoglobina glicada, 12 de out., 7,4 %, acima da faixa do laudo' }));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(main)/member/[id]/exams/[series]', params: { id: memberId, series: 'hba1c' } });
  });

  it('item de vacina abre a carteira da pessoa', async () => {
    const dirce: Omit<NewMember, 'familyId'> = { fullName: 'Dirce Almeida', birthDate: '1952-03-01', relationship: 'parent', sex: 'female' };
    const s = await setup([dirce]);
    const memberId = s.members[0]!.id;
    await s.measurements.createMany([{ ...hba1c, memberId }]);
    await s.renderScreen();

    await fireEvent.press(await screen.findByRole('button', { name: /^Dirce, Influenza de 2026, Pendente/ }));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(main)/member/[id]/vaccines', params: { id: memberId } });
  });

  it('pessoas: a linha não tem menu "…" (abre a pessoa) e o FAB "Novo registro" usa a única pessoa', async () => {
    const s = await setup([ana]);
    const id = s.members[0]!.id;
    await s.renderScreen();
    expect(await screen.findByTestId(`member-${id}`)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Mais ações para Ana Souza' })).toBeNull();

    await activate(screen.getByRole('button', { name: 'Novo registro' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/(main)/record/new', params: { memberId: id } });
  });

  it('vazio: sem pessoas, convida a adicionar e não mostra o FAB', async () => {
    const s = await setup([]);
    await s.renderScreen();
    expect(await screen.findByText('Nenhuma pessoa ainda')).toBeOnTheScreen();
    expect(screen.queryByTestId('new-record-fab')).toBeNull();
  });

  it('modo demo: "Modo demonstração" inline logo abaixo da data, sem flutuar sobre a lista', async () => {
    const s = await setup([ana]);
    await s.renderScreen(true);
    await screen.findByText('Pessoas');
    const badge = screen.getByTestId('demo-badge');
    expect(badge).toHaveTextContent('Modo demonstração');
    expect(screen.queryByTestId('demo-pill')).toBeNull();
    const [date, demo, people] = order(['Quarta-feira, 11 de novembro de 2026', 'Modo demonstração', 'Pessoas']);
    expect(date).toBeLessThan(demo!);
    expect(demo).toBeLessThan(people!);
  });

  it('fora do modo demo, não há aviso de demonstração', async () => {
    const s = await setup([ana]);
    await s.renderScreen();
    await screen.findByText('Pessoas');
    expect(screen.queryByTestId('demo-badge')).toBeNull();
  });

  it('com FAB, a lista reserva a altura do rodapé flutuante (safe area + 12 + FAB 56 + 16)', async () => {
    const s = await setup([ana]);
    await s.renderScreen();
    await screen.findByTestId('new-record-fab');
    expect(StyleSheet.flatten(screen.getByTestId('family-home-screen').props.contentContainerStyle).paddingBottom).toBe(34 + 12 + 56 + 16);
  });

  it('v4: régua de abas com a Família marcada e uma aba por pessoa; a aba e a lista trocam a divisória na mesma tela', async () => {
    const s = await setup([ana, bruno]);
    await s.records.create({ familyId: 'f1', memberId: s.members[1]!.id, type: 'exam', title: 'Hemograma', date: '2026-03-10', location: null, professional: null, notes: null });
    await s.renderScreen();
    expect(await screen.findByTestId('family-tab-rail')).toHaveProp('accessibilityRole', 'tablist');
    expect(screen.getByRole(RAIL_TAB_ROLE, { name: 'Família' })).toBeSelected();
    expect(await screen.findByRole(RAIL_TAB_ROLE, { name: 'Bruno Souza, 1 documento' })).not.toBeSelected();
    expect(screen.getByRole(RAIL_TAB_ROLE, { name: 'Ana Souza, 0 documentos' })).toBeOnTheScreen();

    // Casca única: o título troca no mesmo lugar, sem empilhar tela (sem push, sem Voltar).
    await fireEvent.press(screen.getByRole(RAIL_TAB_ROLE, { name: 'Bruno Souza, 1 documento' }));
    expect(await screen.findByRole('header', { name: 'Bruno Souza' })).toBeOnTheScreen();
    expect(screen.getByRole(RAIL_TAB_ROLE, { name: 'Bruno Souza, 1 documento' })).toBeSelected();
    expect(screen.queryByRole('header', { name: 'Família Souza' })).toBeNull();

    await fireEvent.press(screen.getByRole(RAIL_TAB_ROLE, { name: 'Família' }));
    // A lista de pessoas faz o mesmo que a aba.
    await fireEvent.press(await screen.findByRole('button', { name: /^Ana Souza, Eu/ }));
    expect(await screen.findByRole('header', { name: 'Ana Souza' })).toBeOnTheScreen();
    expect(screen.getByRole(RAIL_TAB_ROLE, { name: 'Ana Souza, 0 documentos' })).toBeSelected();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('erro ao carregar as pessoas: "Tentar de novo"', async () => {
    const s = await setup([ana], { listMembers: () => Promise.reject(new Error('fora do ar')) });
    await s.renderScreen();
    await waitFor(() => expect(screen.getByText('Não foi possível carregar')).toBeOnTheScreen());
    expect(screen.getByRole('header', { name: 'Família Souza' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
  });
});

describe('textos do cabeçalho', () => {
  it('familyTitle e todayHeading', () => {
    expect(familyTitle('Souza')).toBe('Família Souza');
    expect(familyTitle('Família Souza')).toBe('Família Souza');
    expect(familyTitle(undefined)).toBe('Sua família');
    expect(todayHeading('2026-11-11')).toBe('Quarta-feira, 11 de novembro de 2026');
    expect(todayHeading('2026-11-15')).toBe('Domingo, 15 de novembro de 2026');
  });
});
