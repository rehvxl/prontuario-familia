import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Family } from '@/entities/family';
import type { HealthRecord } from '@/entities/health-record';
import type { Measurement, MeasurementRepository } from '@/entities/measurement';
import type { Member } from '@/entities/member';
import { renderWithDependencies } from '@/shared/lib/testing';
import { ThemeProvider } from '@/shared/ui';
import { ExamSeriesScreen } from './ExamSeriesScreen';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => mockRouter, useLocalSearchParams: () => mockParams, useIsFocused: () => true }));
// Folhas SwiftUI não têm árvore RN tocável: nos testes, as variantes em React Native.
jest.mock('@/shared/ui/components/BottomSheet.ios', () => jest.requireActual('@/shared/ui/components/BottomSheet.tsx'));
jest.mock('@/shared/ui/components/ActionSheet.ios', () => jest.requireActual('@/shared/ui/components/ActionSheet.tsx'));

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

const lab = (id: string, over: Partial<Measurement>): Measurement => ({
  id,
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

/** Carlos: 4 HbA1c em % (mesma faixa) e 1 em mmol/mol, mais antigo (R3). */
const hba1c = () => [
  lab('h0', { takenOn: '2026-01-10', value: 55, unit: 'mmol/mol', referenceLow: null, referenceHigh: null }),
  lab('h1', { takenOn: '2026-03-12', value: 7.2 }),
  lab('h2', { takenOn: '2026-06-09', value: 7.5 }),
  lab('h3', { takenOn: '2026-07-09', value: 7.6 }),
  lab('h4', { takenOn: '2026-10-12', value: 7.4, sourceRecordId: 'r1', origin: 'ocr' }),
];

function deps(initial: Measurement[] | (() => Promise<Measurement[]>)) {
  let items = typeof initial === 'function' ? [] : [...initial];
  const repo = {
    listByMember: jest.fn(typeof initial === 'function' ? initial : async () => items),
    remove: jest.fn(async (id: string) => {
      items = items.filter((m) => m.id !== id);
    }),
  };
  return {
    repo,
    dependencies: {
      measurements: repo as unknown as MeasurementRepository,
      members: { getById: async (id: string) => (id === 'carlos' ? carlos : null) },
      families: { getMyFamily: async () => family },
      records: { list: async () => [record] },
    },
  };
}

async function renderScreen(dependencies: ReturnType<typeof deps>['dependencies']) {
  const { wrapper: Wrapper } = renderWithDependencies(dependencies);
  return render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <ThemeProvider scheme="light" reducedMotion>
        <Wrapper>
          <ExamSeriesScreen />
        </Wrapper>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

const VETOED = /\b(normal|anormal|alterado|grave|cr[ií]tico|risco|perigo|alerta|urgente|preocupante|saud[aá]vel|doente|bom|ruim)\b|!/i;
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

const SUMMARY = 'Hemoglobina glicada (HbA1c): 4 resultados de março de 2026 a outubro de 2026. Último: 7,4 %, acima da faixa do laudo.';

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 'carlos', series: 'hba1c' };
});

describe('ExamSeriesScreen (spec F2)', () => {
  it('F2.2 e F2.7: gráfico com os pontos da unidade mais recente e o resumo para leitor de tela, com a lista completa', async () => {
    await renderScreen(deps(hba1c()).dependencies);
    expect(await screen.findByText('Hemoglobina glicada (HbA1c)')).toBeTruthy();
    expect(screen.getByText('Carlos Souza')).toBeTruthy();
    // O gráfico é uma imagem com rótulo = resumo; o resumo também é visível.
    expect(screen.getByRole('image', { name: SUMMARY })).toBeTruthy();
    // Visível, mas fora da árvore de acessibilidade (o leitor já ouve o rótulo da imagem).
    expect(screen.getByText(SUMMARY, { includeHiddenElements: true })).toBeTruthy();
    // Lista completa, do mais recente ao mais antigo (inclui o ponto fora do gráfico).
    expect(screen.getAllByTestId(/^exam-result-/).map((el) => el.props.testID)).toEqual(['exam-result-h4', 'exam-result-h3', 'exam-result-h2', 'exam-result-h1', 'exam-result-h0']);
    // Agora: valor grande, estado A2 e faixa do laudo.
    expect(screen.getByText('Acima da faixa do laudo')).toBeTruthy();
    expect(screen.getByText('Faixa do laudo: 4–5,6 %')).toBeTruthy();
    expect(screen.getByText(A1)).toBeTruthy();
  });

  it('R3 (parcial): resultado em outra unidade fica fora do gráfico, na lista, com o aviso', async () => {
    await renderScreen(deps(hba1c()).dependencies);
    const offChart = await screen.findByTestId('exam-result-h0');
    expect(offChart.props.accessibilityLabel).toContain('Unidade diferente, fora do gráfico');
    expect(screen.getAllByText('Unidade diferente, fora do gráfico')).toHaveLength(1);
  });

  it('R4: com a mesma faixa em todos os pontos, a faixa fica no gráfico (banda) e não se repete por linha', async () => {
    await renderScreen(deps(hba1c()).dependencies);
    await screen.findByTestId('exam-result-h4');
    expect(screen.getAllByText(/^Faixa do laudo:/)).toHaveLength(1);
  });

  it('R4: com faixas diferentes, sem banda e com a faixa em cada linha', async () => {
    mockParams = { id: 'carlos', series: 'creatinine' };
    const creatinine = { code: 'creatinine', label: 'Creatinina', unit: 'mg/dL' };
    await renderScreen(
      deps([
        lab('c1', { ...creatinine, takenOn: '2026-02-01', value: 1.0, referenceLow: 0.6, referenceHigh: 1.2 }),
        lab('c2', { ...creatinine, takenOn: '2026-09-01', value: 1.1, referenceLow: 0.7, referenceHigh: 1.3 }),
      ]).dependencies,
    );
    expect(await screen.findByText('Faixa do laudo: 0,6–1,2 mg/dL')).toBeTruthy();
    expect(screen.getAllByText('Faixa do laudo: 0,7–1,3 mg/dL')).toHaveLength(2); // Agora + linha
    expect(screen.getByRole('image', { name: 'Creatinina: 2 resultados de fevereiro de 2026 a setembro de 2026. Último: 1,1 mg/dL, dentro da faixa do laudo.' })).toBeTruthy();
  });

  it('F2.3: com 1 resultado, mostra o valor e "O gráfico aparece a partir do segundo resultado."', async () => {
    mockParams = { id: 'carlos', series: 'glucose_fasting' };
    await renderScreen(deps([lab('g1', { code: 'glucose_fasting', label: 'Glicose em jejum', value: 92, unit: 'mg/dL', referenceLow: 70, referenceHigh: 99 })]).dependencies);
    expect(await screen.findByText('O gráfico aparece a partir do segundo resultado.')).toBeTruthy();
    expect(screen.getAllByText('92').length).toBeGreaterThan(0);
    expect(screen.getByText('Dentro da faixa do laudo')).toBeTruthy();
    expect(screen.queryByRole('image')).toBeNull();
  });

  it('F2.8: cada resultado mostra a origem e "Ver documento" abre o registro', async () => {
    await renderScreen(deps(hba1c()).dependencies);
    await screen.findByTestId('exam-result-h4');
    await waitFor(() => expect(screen.getAllByText('Do documento Glicada outubro, 12 de out. de 2026')).toHaveLength(2)); // Agora + linha
    expect(screen.getAllByText('Registrado por você')).toHaveLength(4);
    const links = screen.getAllByRole('link', { name: 'Ver documento Glicada outubro' });
    await fireEvent.press(links[links.length - 1]!);
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(main)/record/[id]', params: { id: 'r1' } });
  });

  it('F2.9: editar abre a folha do resultado com o id', async () => {
    await renderScreen(deps(hba1c()).dependencies);
    await fireEvent.press(await screen.findByTestId('exam-result-h3'));
    await fireEvent.press(screen.getByRole('button', { name: 'Editar resultado' }));
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(main)/measurement/new', params: { memberId: 'carlos', measurementId: 'h3' } }));
  });

  it('F2.9: excluir passa pela ConfirmSheet e tira o resultado da lista', async () => {
    const { repo, dependencies } = deps(hba1c());
    await renderScreen(dependencies);
    await fireEvent.press(await screen.findByTestId('exam-result-h3'));
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir resultado' }));
    expect(await screen.findByText('Excluir este resultado?')).toBeTruthy();
    expect(repo.remove).not.toHaveBeenCalled();
    const confirm = screen.getAllByRole('button', { name: 'Excluir resultado' });
    await activate(confirm[confirm.length - 1]!);
    await waitFor(() => expect(repo.remove).toHaveBeenCalledWith('h3'));
    await waitFor(() => expect(screen.queryByTestId('exam-result-h3')).toBeNull());
    expect(screen.getByRole('image', { name: 'Hemoglobina glicada (HbA1c): 3 resultados de março de 2026 a outubro de 2026. Último: 7,4 %, acima da faixa do laudo.' })).toBeTruthy();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('F2.9: excluir o único resultado volta para a lista de exames', async () => {
    mockParams = { id: 'carlos', series: 'glucose_fasting' };
    const { dependencies } = deps([lab('g1', { code: 'glucose_fasting', label: 'Glicose em jejum', value: 92, unit: 'mg/dL', referenceLow: 70, referenceHigh: 99 })]);
    await renderScreen(dependencies);
    await fireEvent.press(await screen.findByTestId('exam-result-g1'));
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir resultado' }));
    const confirm = await screen.findAllByRole('button', { name: 'Excluir resultado' });
    await activate(confirm[confirm.length - 1]!);
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
  });

  it('erro: texto da spec, "Tentar de novo" e A1', async () => {
    await renderScreen(deps(async () => Promise.reject(new Error('rede'))).dependencies);
    expect(await screen.findByText('Não foi possível carregar os exames.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy();
    expect(screen.getByText(A1)).toBeTruthy();
  });

  it('série inexistente: "Exame não encontrado" com voltar', async () => {
    mockParams = { id: 'carlos', series: 'tsh' };
    await renderScreen(deps(hba1c()).dependencies);
    expect(await screen.findByText('Exame não encontrado')).toBeTruthy();
    expect(screen.getByText(A1)).toBeTruthy();
  });

  it('Calma: nenhum texto com palavra vetada nem exclamação (spec §3.2)', async () => {
    const view = await renderScreen(deps(hba1c()).dependencies);
    await screen.findByTestId('exam-result-h4');
    const texts = allTexts(view.toJSON());
    expect(texts.length).toBeGreaterThan(10);
    expect(texts.filter((t) => VETOED.test(t))).toEqual([]);
  });
});
