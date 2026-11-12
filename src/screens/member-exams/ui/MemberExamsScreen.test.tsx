import type { ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Family } from '@/entities/family';
import type { HealthRecord } from '@/entities/health-record';
import type { Measurement, MeasurementRepository } from '@/entities/measurement';
import type { Member } from '@/entities/member';
import { renderWithDependencies } from '@/shared/lib/testing';
import { ThemeProvider } from '@/shared/ui';
import { MemberExamsScreen } from './MemberExamsScreen';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => {
  /* eslint-disable @typescript-eslint/no-require-imports -- fábrica de jest.mock não pode usar imports de topo */
  const React = require('react');
  const { Pressable } = require('react-native');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const Toolbar = Object.assign(({ children }: { children?: unknown }) => React.createElement(React.Fragment, null, children), {
    Button: ({ accessibilityLabel, onPress }: { accessibilityLabel: string; onPress: () => void }) =>
      React.createElement(Pressable, { accessibilityRole: 'button', accessibilityLabel, onPress }),
  });
  return { Stack: { Screen: () => null, Toolbar }, useRouter: () => mockRouter, useLocalSearchParams: () => mockParams, useIsFocused: () => true };
});

const A1 = 'A faixa de referência é a impressa no laudo. Só o profissional de saúde pode interpretar o resultado.';
const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const activate = (element: Parameters<typeof fireEvent>[0]) => fireEvent(element, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

const family: Family = { id: 'fam', name: 'Souza', createdAt: '2026-01-01T00:00:00.000Z', myRole: 'owner' };
const carlos: Member = { id: 'carlos', familyId: 'fam', fullName: 'Carlos Souza', birthDate: '1959-04-02', relationship: 'spouse', sex: 'male', createdAt: '2026-01-01T00:00:00.000Z' };
const record: HealthRecord = {
  id: 'r1',
  familyId: 'fam',
  memberId: 'carlos',
  type: 'result',
  title: 'Glicada outubro',
  date: '2026-10-12',
  location: null,
  professional: null,
  notes: null,
  attachments: [],
  createdAt: '2026-10-12T10:00:00.000Z',
  updatedAt: '2026-10-12T10:00:00.000Z',
};

let seq = 0;
const lab = (over: Partial<Measurement>): Measurement => ({
  id: `m${++seq}`,
  familyId: 'fam',
  memberId: 'carlos',
  kind: 'lab',
  code: 'hba1c',
  label: 'Hemoglobina glicada (HbA1c)',
  value: 7.4,
  value2: null,
  unit: '%',
  referenceLow: 4,
  referenceHigh: 5.6,
  referenceText: null,
  takenOn: '2026-10-12',
  takenAt: null,
  context: null,
  note: null,
  sourceRecordId: null,
  origin: 'manual',
  createdAt: '2026-10-12T10:00:00.000Z',
  updatedAt: '2026-10-12T10:00:00.000Z',
  ...over,
});

function deps(measurements: Measurement[] | (() => Promise<Measurement[]>)) {
  const listByMember = jest.fn(typeof measurements === 'function' ? measurements : async () => measurements);
  const repo = { listByMember } as unknown as MeasurementRepository;
  return {
    measurements: repo,
    members: { getById: async (id: string) => (id === 'carlos' ? carlos : null) },
    families: { getMyFamily: async () => family },
    records: { list: async () => [record] },
  };
}

async function renderScreen(dependencies: ReturnType<typeof deps>, ui: ReactElement = <MemberExamsScreen />) {
  const { wrapper: Wrapper } = renderWithDependencies(dependencies);
  return render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <ThemeProvider scheme="light" reducedMotion>
        <Wrapper>{ui}</Wrapper>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

const VETOED = /\b(normal|anormal|alterado|grave|cr[ií]tico|risco|perigo|alerta|urgente|preocupante|saud[aá]vel|doente|bom|ruim)\b|!/i;
/** Todo texto visível e todo rótulo de acessibilidade da árvore renderizada. */
function allTexts(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') out.push(node);
  else if (Array.isArray(node)) node.forEach((n) => allTexts(n, out));
  else if (node && typeof node === 'object') {
    const { props, children } = node as { props?: Record<string, unknown>; children?: unknown };
    if (typeof props?.accessibilityLabel === 'string') out.push(props.accessibilityLabel);
    allTexts(children, out);
  }
  return out;
}

const fullSet = () => [
  lab({ takenOn: '2026-03-12', value: 7.2 }),
  lab({ takenOn: '2026-10-12', value: 7.4, sourceRecordId: 'r1', origin: 'ocr' }),
  lab({ code: 'glucose_fasting', label: 'Glicose em jejum', value: 92, unit: 'mg/dL', referenceLow: 70, referenceHigh: 99, takenOn: '2026-10-12' }),
  lab({ code: 'creatinine', label: 'Creatinina', value: 1.1, unit: 'mg/dL', referenceLow: 0.7, referenceHigh: 1.3, takenOn: '2026-09-01' }),
  lab({ code: 'hdl', label: 'Colesterol HDL', value: 38, unit: 'mg/dL', referenceLow: 40, referenceHigh: null, takenOn: '2026-08-20' }),
  lab({ code: 'other', label: 'Anti-HBs', value: 12, unit: 'mUI/mL', referenceLow: null, referenceHigh: null, takenOn: '2026-05-01' }),
  lab({ kind: 'vital', code: 'weight', label: 'Peso', value: 82, unit: 'kg', referenceLow: null, referenceHigh: null, takenOn: '2026-11-01' }),
];

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 'carlos' };
});

describe('MemberExamsScreen (spec F2)', () => {
  it('F2.1: lista as séries por grupo do catálogo, fora da faixa primeiro, com valor, data abreviada e estado em texto', async () => {
    await renderScreen(deps(fullSet()));
    expect(await screen.findByText('Hemoglobina glicada (HbA1c)')).toBeTruthy();
    expect(screen.getByText('Carlos Souza')).toBeTruthy();

    const order = screen.getAllByTestId(/^exam-series-/).map((el) => el.props.testID);
    expect(order).toEqual(['exam-series-hba1c', 'exam-series-glucose_fasting', 'exam-series-hdl', 'exam-series-creatinine', 'exam-series-anti-hbs']);
    expect(screen.getAllByTestId(/^exam-group-/).map((el) => el.props.testID)).toEqual(['exam-group-glicemia', 'exam-group-lipidios', 'exam-group-rins', 'exam-group-other']);
    expect(screen.getByText('Glicemia')).toBeTruthy();
    expect(screen.getByText('Perfil lipídico')).toBeTruthy();
    expect(screen.getByText('Função renal')).toBeTruthy();
    expect(screen.getByText('Outros exames')).toBeTruthy();
    // Sinais vitais não entram na lista de exames.
    expect(screen.queryByText('Peso')).toBeNull();

    // Último valor da série, em números tabulares, com data por extenso abreviada e estado R1 em texto.
    expect(screen.getByText('7,4')).toBeTruthy();
    expect(screen.queryByText('7,2')).toBeNull();
    expect(screen.getByText('Faixa do laudo: 4–5,6 % · 12 de out. de 2026')).toBeTruthy();
    expect(screen.getAllByText('Acima da faixa do laudo')).toHaveLength(1);
    expect(screen.getAllByText('Abaixo da faixa do laudo')).toHaveLength(1);
    expect(screen.getAllByText('Dentro da faixa do laudo')).toHaveLength(2);
    expect(screen.getByText('Sem faixa no laudo')).toBeTruthy();
    // Origem (S5).
    expect(screen.getByText('Do documento Glicada outubro, 12 de out. de 2026')).toBeTruthy();
    expect(screen.getAllByText('Registrado por você')).toHaveLength(4);
    expect(screen.getByText(A1)).toBeTruthy();
  });

  it('abre a série ao tocar na linha e o formulário em "Adicionar resultado"', async () => {
    await renderScreen(deps(fullSet()));
    await fireEvent.press(await screen.findByTestId('exam-series-hba1c'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(main)/member/[id]/exams/[series]', params: { id: 'carlos', series: 'hba1c' } });

    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar resultado' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/(main)/measurement/new', params: { memberId: 'carlos' } });
  });

  it('estado vazio com o texto da spec, a ação e A1', async () => {
    await renderScreen(deps([]));
    expect(await screen.findByText('Nenhum exame registrado.')).toBeTruthy();
    expect(screen.getByText('Adicione um resultado ou guarde um laudo para preencher automaticamente.')).toBeTruthy();
    expect(screen.getByText(A1)).toBeTruthy();
    const buttons = screen.getAllByRole('button', { name: 'Adicionar resultado' });
    await activate(buttons[buttons.length - 1]!);
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(main)/measurement/new', params: { memberId: 'carlos' } });
  });

  it('estado de erro com o texto da spec e "Tentar de novo", que busca de novo', async () => {
    let calls = 0;
    const d = deps(async () => {
      calls += 1;
      if (calls === 1) throw new Error('rede');
      return fullSet();
    });
    await renderScreen(d);
    expect(await screen.findByText('Não foi possível carregar os exames.')).toBeTruthy();
    expect(screen.getByText(A1)).toBeTruthy();
    await activate(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByTestId('exam-series-hba1c')).toBeTruthy();
  });

  it('carregando: esqueleto e A1', async () => {
    await renderScreen(deps(() => new Promise<Measurement[]>(() => undefined)));
    expect(await screen.findByText('Carlos Souza')).toBeTruthy();
    expect(screen.getByLabelText('Carregando')).toBeTruthy();
    expect(screen.getByText(A1)).toBeTruthy();
  });

  it('pessoa removida: "Pessoa não encontrada" com voltar', async () => {
    mockParams = { id: 'ninguem' };
    await renderScreen(deps([]));
    expect(await screen.findByText('Pessoa não encontrada')).toBeTruthy();
  });

  it('Calma: nenhum texto com palavra vetada nem exclamação (spec §3.2)', async () => {
    const view = await renderScreen(deps(fullSet()));
    await screen.findByTestId('exam-series-hba1c');
    const texts = allTexts(view.toJSON());
    expect(texts.length).toBeGreaterThan(10);
    expect(texts.filter((t) => VETOED.test(t))).toEqual([]);
  });
});
