import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createLocalHealthRecordRepository } from '@/entities/health-record';
import { createLocalMedicationRepository, type Medication, type MedicationRepository } from '@/entities/medication';
import { createLocalMemberRepository } from '@/entities/member';
import { DEPENDENCY_KEYS, LOCAL_COLLECTIONS, type LocalDb } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { ThemeProvider } from '@/shared/ui';
import { MemberMedicationsScreen } from './MemberMedicationsScreen';

// "Hoje" fixo da spec (F4.2): 11/11/2026.
jest.mock('@/shared/lib', () => ({ ...jest.requireActual('@/shared/lib'), toLocalIsoDate: () => '2026-11-11' }));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => {
  /* eslint-disable @typescript-eslint/no-require-imports -- fábrica de jest.mock não pode usar imports de topo */
  const React = require('react');
  const { Pressable } = require('react-native');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const Toolbar = Object.assign(({ children }: { children?: unknown }) => React.createElement(React.Fragment, null, children), {
    Button: ({ accessibilityLabel, onPress }: { accessibilityLabel: string; onPress: () => void }) =>
      React.createElement(Pressable, { accessibilityRole: 'button', accessibilityLabel, onPress }),
  });
  return { Stack: { Screen: () => null, Toolbar }, useRouter: () => mockRouter, useLocalSearchParams: () => ({ id: 'm1' }), useIsFocused: () => true };
});
// Folhas SwiftUI não têm árvore RN tocável: nos testes usa a variante RN (como em application/flows.test.tsx).
jest.mock('@/shared/ui/components/BottomSheet.ios', () => jest.requireActual('@/shared/ui/components/BottomSheet.tsx'));
// Calendário nativo → campo de texto 'YYYY-MM-DD'.
jest.mock('@react-native-community/datetimepicker', () => {
  /* eslint-disable @typescript-eslint/no-require-imports -- fábrica de jest.mock */
  const React = require('react');
  const { TextInput } = require('react-native');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const Picker = ({ onValueChange }: { onValueChange: (e: unknown, d: Date) => void }) =>
    React.createElement(TextInput, { testID: 'date-picker', onChangeText: (t: string) => onValueChange({}, new Date(`${t}T12:00:00`)) });
  return { __esModule: true, default: Picker, DateTimePickerAndroid: { open: jest.fn() } };
});

/** Botões SwiftUI no iOS respondem à ação de acessibilidade `activate` (docs/DESIGN_SYSTEM.md §5). */
const activate = (el: Parameters<typeof fireEvent>[0]) => fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

const NOW = '2026-11-01T10:00:00.000Z';
const med = (over: Partial<Medication> & Pick<Medication, 'id' | 'name' | 'startOn' | 'endOn'>): Medication => ({
  familyId: 'f1',
  memberId: 'm1',
  dosage: null,
  instructions: null,
  sourceRecordId: null,
  origin: 'manual',
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

const LOSARTANA = med({ id: 'los', name: 'Losartana', dosage: '50 mg', instructions: '1 comprimido pela manhã', startOn: '2026-11-01', endOn: null });
const AMOXICILINA = med({
  id: 'amo',
  name: 'Amoxicilina',
  dosage: '500 mg',
  instructions: 'De 8 em 8 horas',
  startOn: '2026-11-05',
  endOn: '2026-11-11',
  origin: 'ocr',
  sourceRecordId: 'r1',
});
const DIPIRONA = med({ id: 'dip', name: 'Dipirona', startOn: '2026-11-01', endOn: '2026-11-10' });
const VITAMINA = med({ id: 'vit', name: 'Vitamina D', startOn: '2026-11-12', endOn: null });

async function setup(meds: Medication[], overrides: { medications?: Partial<MedicationRepository>; recordsFail?: boolean } = {}) {
  const db: LocalDb = createMemoryDb();
  await db.put(LOCAL_COLLECTIONS.members, 'm1', { id: 'm1', familyId: 'f1', fullName: 'Carlos Souza', birthDate: '1968-03-02', relationship: 'self', sex: 'male', createdAt: NOW });
  await db.put(LOCAL_COLLECTIONS.records, 'r1', {
    id: 'r1',
    familyId: 'f1',
    memberId: 'm1',
    type: 'prescription',
    title: 'Receita clínica geral',
    date: '2026-11-05',
    location: null,
    professional: null,
    notes: null,
    attachments: [],
    createdAt: NOW,
    updatedAt: NOW,
  });
  for (const m of meds) await db.put(LOCAL_COLLECTIONS.medications, m.id, m);
  const records = createLocalHealthRecordRepository(db);
  const { wrapper: Wrapper } = renderWithDependencies({
    [DEPENDENCY_KEYS.members]: createLocalMemberRepository(db),
    [DEPENDENCY_KEYS.medications]: { ...createLocalMedicationRepository(db), ...overrides.medications },
    [DEPENDENCY_KEYS.records]: overrides.recordsFail ? { ...records, list: () => Promise.reject(new Error('offline')) } : records,
  });
  await render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
      <ThemeProvider scheme="light" reducedMotion>
        <Wrapper>
          <MemberMedicationsScreen />
        </Wrapper>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  return db;
}

/** Todo texto visível da árvore (para a ordem das seções e a métrica "Calma"). */
function allText(): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string') out.push(node);
    else if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object' && 'children' in node) walk((node as { children: unknown }).children);
  };
  walk(screen.toJSON());
  return out;
}

const VETADAS = new Set(['normal', 'anormal', 'alterado', 'grave', 'crítico', 'risco', 'perigo', 'alerta', 'urgente', 'preocupante', 'saudável', 'doente', 'bom', 'ruim']);
function expectCalm() {
  const text = allText().join(' ');
  expect(text).not.toContain('!');
  const words = text.toLowerCase().split(/[^\p{L}]+/u);
  expect(words.filter((w) => VETADAS.has(w))).toEqual([]);
}

const A5 = 'Lista para consulta. Não mude o tratamento sem falar com o profissional de saúde.';

beforeEach(() => jest.clearAllMocks());

describe('MemberMedicationsScreen (spec F4)', () => {
  it('F4.1 e F4.2: separa Em uso, Começa em breve e Anteriores pela R5, com nome, dosagem e instrução', async () => {
    await setup([LOSARTANA, AMOXICILINA, DIPIRONA, VITAMINA]);
    expect(await screen.findByText('Losartana 50 mg')).toBeTruthy();
    expect(screen.getByText('Carlos Souza')).toBeTruthy();

    const text = allText();
    const order = ['Em uso', 'Começa em breve', 'Anteriores'].map((t) => text.indexOf(t));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);

    // Início 01/11 sem fim → Em uso; início 05/11 e fim 11/11 → Em uso (o dia do fim ainda é uso).
    const active = screen.getByTestId('medication-los');
    expect(within(active).getByText('1 comprimido pela manhã · uso contínuo')).toBeTruthy();
    expect(within(screen.getByTestId('medication-amo')).getByText('De 8 em 8 horas · até 11 de nov. de 2026')).toBeTruthy();
    expect(text.indexOf('Amoxicilina 500 mg')).toBeLessThan(text.indexOf('Começa em breve'));
    // Início 12/11 → "Começa em 12 de nov. de 2026".
    expect(screen.getByText('Começa em 12 de nov. de 2026')).toBeTruthy();

    // Anteriores começam recolhidos.
    expect(screen.queryByText('Dipirona')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar 1 anterior' }));
    expect(screen.getByText('Dipirona')).toBeTruthy();
    // Fim 10/11 → "Encerrado em 10 de nov. de 2026".
    expect(screen.getByText('Encerrado em 10 de nov. de 2026')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar anteriores' }));
    expect(screen.queryByText('Dipirona')).toBeNull();
  });

  it('F4.6: mostra a A5 e a origem de cada item (S5)', async () => {
    await setup([LOSARTANA, AMOXICILINA]);
    expect(await screen.findByText('Losartana 50 mg')).toBeTruthy();
    expect(screen.getByText(A5)).toBeTruthy();
    expect(within(screen.getByTestId('medication-los')).getByText('Registrado por você')).toBeTruthy();
    expect(await within(screen.getByTestId('medication-amo')).findByText('Do documento Receita clínica geral, 5 de nov. de 2026')).toBeTruthy();
    // Um elemento de acessibilidade por linha, com tudo o que ela mostra.
    expect(screen.getByRole('button', { name: 'Losartana 50 mg, 1 comprimido pela manhã · uso contínuo, Registrado por você' })).toBeTruthy();
    expectCalm();
  });

  it('F4.4: "Encerrar uso" pede a data (padrão hoje) e grava endOn; o item continua no histórico', async () => {
    const db = await setup([LOSARTANA]);
    await fireEvent.press(await screen.findByTestId('medication-los'));
    expect(screen.getByText('Início')).toBeTruthy();
    await activate(screen.getByTestId('end-medication'));
    expect(screen.getByRole('button', { name: 'Data de término: 11 de novembro de 2026' })).toBeTruthy();
    await activate(screen.getByTestId('confirm-end-medication'));
    await waitFor(async () => expect((await db.get<Medication>(LOCAL_COLLECTIONS.medications, 'los'))?.endOn).toBe('2026-11-11'));
    // R5: com fim hoje ainda é uso (F4.2); a linha passa a mostrar o fim.
    expect(await screen.findByText('1 comprimido pela manhã · até 11 de nov. de 2026')).toBeTruthy();
    expect(screen.queryByTestId('medication-detail')).toBeNull();
  });

  it('F4.4: encerrar com data passada leva o item para Anteriores, sem apagar', async () => {
    const db = await setup([LOSARTANA]);
    await fireEvent.press(await screen.findByTestId('medication-los'));
    await activate(screen.getByTestId('end-medication'));
    await fireEvent.press(screen.getByTestId('medication-end-date'));
    await fireEvent.changeText(screen.getByTestId('date-picker'), '2026-11-10');
    await activate(screen.getByRole('button', { name: 'Concluir' }));
    await activate(screen.getByTestId('confirm-end-medication'));
    expect(await screen.findByText('Encerrado em 10 de nov. de 2026')).toBeTruthy();
    expect(screen.getByText('Anteriores')).toBeTruthy();
    expect(await db.get<Medication>(LOCAL_COLLECTIONS.medications, 'los')).toMatchObject({ endOn: '2026-11-10' });
  });

  it('F4.5: término antes do início não salva e explica', async () => {
    const db = await setup([LOSARTANA]);
    await fireEvent.press(await screen.findByTestId('medication-los'));
    await activate(screen.getByTestId('end-medication'));
    await fireEvent.press(screen.getByTestId('medication-end-date'));
    await fireEvent.changeText(screen.getByTestId('date-picker'), '2026-10-31');
    await activate(screen.getByRole('button', { name: 'Concluir' }));
    await activate(screen.getByTestId('confirm-end-medication'));
    expect(await screen.findByText('A data de término precisa ser igual ou posterior ao início.')).toBeTruthy();
    expect((await db.get<Medication>(LOCAL_COLLECTIONS.medications, 'los'))?.endOn).toBeNull();
  });

  it('L8: excluir passa pela ConfirmSheet e tira o item da lista', async () => {
    const db = await setup([LOSARTANA, VITAMINA]);
    await fireEvent.press(await screen.findByTestId('medication-vit'));
    // Começa no futuro: não há "Encerrar uso", só excluir.
    expect(screen.queryByTestId('end-medication')).toBeNull();
    await activate(screen.getByTestId('delete-medication'));
    expect(screen.getByText('Excluir este medicamento?')).toBeTruthy();
    const confirm = screen.getAllByRole('button', { name: 'Excluir medicamento' }).at(-1)!;
    await activate(confirm);
    await waitFor(() => expect(screen.queryByText('Vitamina D')).toBeNull());
    expect(await db.get(LOCAL_COLLECTIONS.medications, 'vit')).toBeNull();
    expect(screen.getByText('Losartana 50 mg')).toBeTruthy();
  });

  it('"Ver documento" abre o registro de origem', async () => {
    await setup([AMOXICILINA]);
    await fireEvent.press(await screen.findByTestId('medication-amo'));
    await activate(screen.getByRole('button', { name: 'Ver documento' }));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(main)/record/[id]', params: { id: 'r1' } });
  });

  it('vazio: texto da spec, A5 e ações para adicionar', async () => {
    await setup([]);
    expect(await screen.findByText('Nenhum medicamento registrado.')).toBeTruthy();
    expect(screen.getByText('Guarde uma receita ou adicione manualmente.')).toBeTruthy();
    expect(screen.getByText(A5)).toBeTruthy();
    await activate(screen.getAllByRole('button', { name: 'Adicionar medicamento' }).at(-1)!);
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(main)/medication/new', params: { memberId: 'm1' } });
    await activate(screen.getByRole('button', { name: 'Guardar receita' }));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(main)/record/new', params: { memberId: 'm1' } });
    expectCalm();
  });

  it('o botão do cabeçalho abre a folha de novo medicamento', async () => {
    await setup([LOSARTANA]);
    await screen.findByText('Losartana 50 mg');
    await fireEvent.press(screen.getAllByRole('button', { name: 'Adicionar medicamento' })[0]!);
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(main)/medication/new', params: { memberId: 'm1' } });
  });

  it('carregando: esqueleto com rótulo, A5 já visível', async () => {
    await setup([], { medications: { listByMember: () => new Promise<Medication[]>(() => undefined) } });
    expect(screen.getByLabelText('Carregando')).toBeTruthy();
    expect(screen.getByText(A5)).toBeTruthy();
  });

  it('erro: "Tentar de novo" recarrega', async () => {
    const listByMember = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue([LOSARTANA]);
    await setup([], { medications: { listByMember } });
    expect(await screen.findByText('Não foi possível carregar')).toBeTruthy();
    await act(async () => {
      await activate(screen.getByRole('button', { name: 'Tentar de novo' }));
    });
    expect(await screen.findByText('Losartana 50 mg')).toBeTruthy();
  });

  it('parcial: sem os registros, a origem do documento aparece genérica e a lista continua', async () => {
    await setup([AMOXICILINA], { recordsFail: true });
    expect(await screen.findByText('Do documento de origem')).toBeTruthy();
    expect(screen.getByText('Amoxicilina 500 mg')).toBeTruthy();
  });
});
