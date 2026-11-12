import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DEPENDENCY_KEYS } from '@/shared/lib';
import { renderWithDependencies } from '@/shared/lib/testing';
import { ThemeProvider } from '@/shared/ui';
import type { Measurement } from '@/entities/measurement';
import { MemberVitalsScreen } from './MemberVitalsScreen';

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

const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const A4 = 'O app não avalia estes valores. Mostre a sequência ao profissional que acompanha Carlos.';
const VETADAS = /\b(normal|anormal|alterado|grave|crítico|risco|perigo|alerta|urgente|preocupante|saudável|doente|bom|ruim)\b|!|IMC/i;

const activate = (element: Parameters<typeof fireEvent>[0]) => fireEvent(element, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

const textsOf = (node: unknown): string[] => {
  if (node == null) return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(textsOf);
  const n = node as { props?: Record<string, unknown>; children?: unknown };
  const label = n.props?.accessibilityLabel;
  return [...(typeof label === 'string' ? [label] : []), ...textsOf(n.children ?? null)];
};

/** Linhas do gráfico: cada série vira um `RNSVGPath` (o `Polyline` do react-native-svg). */
const lineCount = () => JSON.stringify(screen.getByTestId('vitals-chart').children).match(/"type":"RNSVGPath"/g)?.length ?? 0;

let seq = 0;
const vital = (over: Partial<Measurement> & Pick<Measurement, 'code' | 'value' | 'unit' | 'takenOn'>): Measurement => ({
  id: `v${++seq}`,
  familyId: 'f1',
  memberId: 'm1',
  kind: 'vital',
  label: over.code,
  value2: null,
  referenceLow: null,
  referenceHigh: null,
  referenceText: null,
  takenAt: null,
  context: null,
  note: null,
  sourceRecordId: null,
  origin: 'manual',
  createdAt: '2026-11-11T09:00:00.000Z',
  updatedAt: '2026-11-11T09:00:00.000Z',
  ...over,
});

const CARLOS: Measurement[] = [
  vital({ id: 'bp2', code: 'bp', value: 138, value2: 86, unit: 'mmHg', takenOn: '2026-11-05', takenAt: '07:50' }),
  vital({ id: 'bp3', code: 'bp', value: 142, value2: 88, unit: 'mmHg', takenOn: '2026-11-10', takenAt: '08:12' }),
  vital({ id: 'bp1', code: 'bp', value: 136, value2: 84, unit: 'mmHg', takenOn: '2026-11-02', takenAt: '08:05' }),
  vital({ id: 'g1', code: 'glucose_capillary', value: 128, unit: 'mg/dL', takenOn: '2026-11-10', takenAt: '07:40', context: 'fasting' }),
  vital({ id: 'w1', code: 'weight', value: 82.4, unit: 'kg', takenOn: '2026-11-02' }),
  vital({ id: 'w2', code: 'weight', value: 81.9, unit: 'kg', takenOn: '2026-10-02' }),
  // Exame com faixa no laudo: não entra nos sinais vitais.
  { ...vital({ id: 'lab', code: 'hba1c', value: 7.4, unit: '%', takenOn: '2026-10-28' }), kind: 'lab' as const, referenceHigh: 5.6 },
];

let listByMember: jest.Mock<Promise<Measurement[]>, [string]>;

async function renderScreen(params: Record<string, string>, list: () => Promise<Measurement[]> = async () => CARLOS) {
  mockParams = params;
  listByMember = jest.fn((_memberId: string) => list());
  const { wrapper: Wrapper } = renderWithDependencies({
    [DEPENDENCY_KEYS.members]: { getById: async () => ({ id: 'm1', familyId: 'f1', fullName: 'Carlos Souza', birthDate: '1962-03-02' }) },
    [DEPENDENCY_KEYS.measurements]: { listByMember },
  });
  return render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <ThemeProvider scheme="light" reducedMotion>
        <Wrapper>
          <MemberVitalsScreen />
        </Wrapper>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe('MemberVitalsScreen (spec F5)', () => {
  it('F5.4: pressão com a última medição, duas linhas (sistólica e diastólica), lista com data e hora e A4', async () => {
    await renderScreen({ id: 'm1', code: 'bp' });
    expect(await screen.findByText(A4)).toBeOnTheScreen();
    expect(screen.getByText('Pressão arterial')).toBeOnTheScreen();
    expect(screen.getByText('Carlos Souza')).toBeOnTheScreen();
    expect(listByMember).toHaveBeenCalledWith('m1');

    const latest = screen.getByTestId('vitals-latest');
    expect(screen.getAllByLabelText('142 por 88 milímetros de mercúrio').length).toBeGreaterThan(0);
    expect(latest).toHaveTextContent(/10 de nov\. de 2026, 8h12/);
    expect(latest).toHaveTextContent(/Registrado por você/);

    const chart = screen.getByRole('image', {
      name: 'Pressão arterial, sistólica e diastólica: 3 medições de 2 de nov. de 2026 a 10 de nov. de 2026. Última: 142/88 mmHg.',
    });
    expect(chart).toBeOnTheScreen();
    expect(lineCount()).toBe(2);
    expect(screen.getByText('Sistólica', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Diastólica', { includeHiddenElements: true })).toBeTruthy();

    // Mais recente primeiro, com data e hora.
    const rows = ['bp3', 'bp2', 'bp1'].map((id) => screen.getByTestId(`vital-row-${id}`).props.accessibilityLabel);
    expect(rows).toEqual([
      '10 de nov. de 2026, 8h12, 142 por 88 milímetros de mercúrio, Registrado por você',
      '5 de nov. de 2026, 7h50, 138 por 86 milímetros de mercúrio, Registrado por você',
      '2 de nov. de 2026, 8h05, 136 por 84 milímetros de mercúrio, Registrado por você',
    ]);
    expect(screen.queryByTestId('vital-row-g1')).toBeNull();
  });

  it('F5.4: glicemia capilar mostra o momento; com uma medição só não há gráfico (parcial)', async () => {
    await renderScreen({ id: 'm1', code: 'glucose_capillary' });
    expect(await screen.findByText(A4)).toBeOnTheScreen();
    expect(screen.getByTestId('vital-row-g1').props.accessibilityLabel).toBe(
      '10 de nov. de 2026, 7h40, 128 miligramas por decilitro, Em jejum · Registrado por você',
    );
    expect(screen.queryByTestId('vitals-chart')).toBeNull();
    expect(screen.queryByText('Evolução')).toBeNull();
  });

  it('F5.4: peso sem hora mostra só a data; gráfico de uma linha', async () => {
    await renderScreen({ id: 'm1', code: 'weight' });
    expect(await screen.findByText(A4)).toBeOnTheScreen();
    expect(screen.getByTestId('vital-row-w1').props.accessibilityLabel).toBe('2 de nov. de 2026, 82,4 quilogramas, Registrado por você');
    expect(screen.getByRole('image', { name: 'Peso: 2 medições de 2 de out. de 2026 a 2 de nov. de 2026. Última: 82,4 kg.' })).toBeOnTheScreen();
    expect(lineCount()).toBe(1);
  });

  it.each(['bp', 'glucose_capillary', 'weight', 'height'])('F5.5 e §3.2 (%s): sem faixa, sem IMC e sem palavras vetadas', async (code) => {
    const { toJSON } = await renderScreen({ id: 'm1', code });
    expect(await screen.findByText(A4)).toBeOnTheScreen();
    const texts = textsOf(toJSON()).join(' | ');
    expect(texts).not.toMatch(VETADAS);
    expect(texts).not.toMatch(/faixa/i);
  });

  it('vazio: "Nenhuma medição registrada." com a ação de registrar o tipo da tela', async () => {
    await renderScreen({ id: 'm1', code: 'height' });
    expect(await screen.findByText('Nenhuma medição registrada.')).toBeOnTheScreen();
    expect(screen.getByText(A4)).toBeOnTheScreen();
    await activate(screen.getAllByRole('button', { name: 'Registrar sinal vital' }).at(-1)!);
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(main)/vital/new', params: { memberId: 'm1', kind: 'height' } });
  });

  it('o botão do cabeçalho abre a folha de registro já no tipo da tela', async () => {
    await renderScreen({ id: 'm1', code: 'bp' });
    await screen.findByText(A4);
    await fireEvent.press(screen.getAllByRole('button', { name: 'Registrar sinal vital' })[0]!);
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(main)/vital/new', params: { memberId: 'm1', kind: 'bp' } });
  });

  it('carregando: esqueleto anunciado como "Carregando"', async () => {
    await renderScreen({ id: 'm1', code: 'bp' }, () => new Promise(() => {}));
    expect(screen.getByLabelText('Carregando')).toBeOnTheScreen();
    expect(screen.queryByText(A4)).toBeNull();
  });

  it('erro: mensagem e "Tentar de novo" consulta de novo', async () => {
    await renderScreen({ id: 'm1', code: 'bp' }, async () => {
      throw new Error('rede');
    });
    expect(await screen.findByText('Não foi possível carregar as medições.')).toBeOnTheScreen();
    await activate(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(listByMember).toHaveBeenCalledTimes(2));
  });

  it('código desconhecido na rota mostra que o sinal vital não existe', async () => {
    await renderScreen({ id: 'm1', code: 'imc' });
    expect(screen.getByText('Sinal vital não encontrado')).toBeOnTheScreen();
  });
});
