import type { ReactElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DEPENDENCY_KEYS } from '@/shared/lib';
import { renderWithDependencies } from '@/shared/lib/testing';
import { ThemeProvider } from '@/shared/ui';
import type { Measurement, NewMeasurement } from '@/entities/measurement';
import { VitalEntryForm } from './VitalEntryForm';

// Hoje = 11/11/2026, 9h30 (só o relógio é falso: os timers seguem reais para o React Query).
const NOW = new Date(2026, 10, 11, 9, 30);
const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const A4 = 'O app não avalia estes valores. Mostre a sequência ao profissional que acompanha Carlos.';
const BP_ORDER = 'A primeira pressão (sistólica) costuma ser maior que a segunda (diastólica). Confira os números.';
const VETADAS = /\b(normal|anormal|alterado|grave|crítico|risco|perigo|alerta|urgente|preocupante|saudável|doente|bom|ruim)\b|!|IMC/i;

const activate = (element: Parameters<typeof fireEvent>[0]) => fireEvent(element, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
const chooseOption = async (name: RegExp, value: string) => {
  await fireEvent(screen.getByRole('button', { name }), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 48 } } });
  await fireEvent(await screen.findByRole('button', { name }), 'pressAction', { nativeEvent: { event: value } });
};

let createMany: jest.Mock<Promise<Measurement[]>, [NewMeasurement[]]>;
let onSaved: jest.Mock;

async function renderForm(ui: ReactElement) {
  createMany = jest.fn(async (items: NewMeasurement[]) =>
    items.map((m, i) => ({ ...m, id: `v${i}`, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() })),
  );
  const { wrapper: Wrapper } = renderWithDependencies({
    [DEPENDENCY_KEYS.members]: { getById: async () => ({ id: 'm1', familyId: 'f1', fullName: 'Carlos Souza', birthDate: '1962-03-02' }) },
    [DEPENDENCY_KEYS.measurements]: { listByMember: async () => [], createMany },
  });
  const result = await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <ThemeProvider scheme="light" reducedMotion>
        <Wrapper>{ui}</Wrapper>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  await screen.findByText(A4);
  return result;
}

type Node = { props?: Record<string, unknown>; children?: unknown } | string | null | Node[];
/** Textos visíveis e rótulos de acessibilidade da árvore (para a métrica "Calma", spec §2). */
const textsOf = (node: unknown): string[] => {
  if (node == null) return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(textsOf);
  const n = node as Exclude<Node, string | null | Node[]>;
  const label = n.props?.accessibilityLabel;
  return [...(typeof label === 'string' ? [label] : []), ...textsOf(n.children ?? null)];
};

const saved = () => createMany.mock.calls.map(([items]) => items[0]!);

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'hrtime'] });
  jest.setSystemTime(NOW);
  onSaved = jest.fn();
});
afterEach(() => jest.useRealTimers());

describe('VitalEntryForm (spec F5)', () => {
  it('F5.1: oferece os quatro sinais vitais e, na pressão, sistólica e diastólica em mmHg com data de hoje e hora de agora', async () => {
    await renderForm(<VitalEntryForm memberId="m1" onSaved={onSaved} />);
    expect(screen.getByRole('button', { name: /Sinal vital/ })).toBeOnTheScreen();
    for (const [code, label] of [
      ['glucose_capillary', 'Glicemia capilar'],
      ['weight', 'Peso'],
      ['height', 'Altura'],
      ['bp', 'Pressão arterial'],
    ]) {
      await chooseOption(/Sinal vital/, code!);
      expect(screen.getByRole('button', { name: `Sinal vital: ${label}` })).toBeOnTheScreen();
    }

    expect(screen.getByLabelText('Sistólica, em milímetros de mercúrio')).toBeOnTheScreen();
    expect(screen.getByLabelText('Diastólica, em milímetros de mercúrio')).toBeOnTheScreen();
    expect(screen.getAllByText('mmHg', { includeHiddenElements: true })).toHaveLength(2);
    expect(screen.getByTestId('vital-time').props.value).toBe('09:30');
    expect(screen.getByRole('button', { name: 'Data: 11 de novembro de 2026' })).toBeOnTheScreen();
  });

  it('F5.1: grava a pressão com a data e a hora padrão, sem faixa', async () => {
    await renderForm(<VitalEntryForm memberId="m1" kind="bp" onSaved={onSaved} />);
    await fireEvent.changeText(screen.getByTestId('vital-systolic'), '142');
    await fireEvent.changeText(screen.getByTestId('vital-diastolic'), '88');
    await activate(screen.getByRole('button', { name: 'Salvar medida' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(saved()).toEqual([
      expect.objectContaining({
        familyId: 'f1',
        memberId: 'm1',
        kind: 'vital',
        code: 'bp',
        value: 142,
        value2: 88,
        unit: 'mmHg',
        takenOn: '2026-11-11',
        takenAt: '09:30',
        referenceLow: null,
        referenceHigh: null,
        origin: 'manual',
      }),
    ]);
  });

  it('F5.1: glicemia capilar em mg/dL com "Em jejum", "Após refeição" ou "Outro momento"', async () => {
    await renderForm(<VitalEntryForm memberId="m1" kind="glucose_capillary" onSaved={onSaved} />);
    expect(screen.getByLabelText('Glicemia capilar, em miligramas por decilitro')).toBeOnTheScreen();
    expect(screen.getByText('mg/dL', { includeHiddenElements: true })).toBeOnTheScreen();
    for (const label of ['Em jejum', 'Após refeição', 'Outro momento']) expect(screen.getByRole('button', { name: label })).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByTestId('vital-value'), '128');
    await fireEvent.press(screen.getByRole('button', { name: 'Em jejum' }));
    await activate(screen.getByRole('button', { name: 'Salvar medida' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(saved()[0]).toMatchObject({ code: 'glucose_capillary', value: 128, unit: 'mg/dL', context: 'fasting' });
  });

  it('F5.1: peso em kg com 1 casa decimal e altura em cm', async () => {
    await renderForm(<VitalEntryForm memberId="m1" kind="weight" onSaved={onSaved} />);
    expect(screen.getByLabelText('Peso, em quilogramas')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('vital-value'), '82,46');
    await activate(screen.getByRole('button', { name: 'Salvar medida' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(saved()[0]).toMatchObject({ code: 'weight', value: 82.5, unit: 'kg' });

    await chooseOption(/Sinal vital/, 'height');
    expect(screen.getByLabelText('Altura, em centímetros')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('vital-value'), '176');
    await activate(screen.getByRole('button', { name: 'Salvar medida' }));
    await waitFor(() => expect(createMany).toHaveBeenCalledTimes(2));
    expect(saved()[1]).toMatchObject({ code: 'height', value: 176, unit: 'cm' });
  });

  it.each([
    ['120', '120'],
    ['80', '120'],
  ])('F5.2: sistólica %s e diastólica %s não salvam e pedem conferência', async (sys, dia) => {
    await renderForm(<VitalEntryForm memberId="m1" kind="bp" onSaved={onSaved} />);
    await fireEvent.changeText(screen.getByTestId('vital-systolic'), sys);
    await fireEvent.changeText(screen.getByTestId('vital-diastolic'), dia);
    await activate(screen.getByRole('button', { name: 'Salvar medida' }));
    expect(await screen.findByText(BP_ORDER)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Salvar assim' })).toBeNull();
    expect(createMany).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it.each([
    ['bp', { 'vital-systolic': '320', 'vital-diastolic': '90' }, 'Confira o valor: 320/90 mmHg parece fora do que um aparelho costuma medir.'],
    ['bp', { 'vital-systolic': '140', 'vital-diastolic': '25' }, 'Confira o valor: 140/25 mmHg parece fora do que um aparelho costuma medir.'],
    ['glucose_capillary', { 'vital-value': '9' }, 'Confira o valor: 9 mg/dL parece fora do que um aparelho costuma medir.'],
    ['glucose_capillary', { 'vital-value': '801' }, 'Confira o valor: 801 mg/dL parece fora do que um aparelho costuma medir.'],
    ['weight', { 'vital-value': '0,4' }, 'Confira o valor: 0,4 kg parece fora do que um aparelho costuma medir.'],
    ['weight', { 'vital-value': '401' }, 'Confira o valor: 401 kg parece fora do que um aparelho costuma medir.'],
    ['height', { 'vital-value': '29' }, 'Confira o valor: 29 cm parece fora do que um aparelho costuma medir.'],
    ['height', { 'vital-value': '251' }, 'Confira o valor: 251 cm parece fora do que um aparelho costuma medir.'],
  ] as const)('F5.3: %s fora dos limites de digitação mostra A14 (%j)', async (kind, fields, a14) => {
    await renderForm(<VitalEntryForm memberId="m1" kind={kind} onSaved={onSaved} />);
    for (const [testID, text] of Object.entries(fields)) await fireEvent.changeText(screen.getByTestId(testID), text);
    await activate(screen.getByRole('button', { name: 'Salvar medida' }));
    expect(await screen.findByText(a14)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Salvar assim' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Corrigir' })).toBeOnTheScreen();
    expect(createMany).not.toHaveBeenCalled();
  });

  it('F5.3: "Salvar assim" grava o valor conferido', async () => {
    await renderForm(<VitalEntryForm memberId="m1" kind="glucose_capillary" onSaved={onSaved} />);
    await fireEvent.changeText(screen.getByTestId('vital-value'), '850');
    await activate(screen.getByRole('button', { name: 'Salvar medida' }));
    await activate(await screen.findByRole('button', { name: 'Salvar assim' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(saved()[0]).toMatchObject({ code: 'glucose_capillary', value: 850 });
  });

  it('F5.3: "Corrigir" volta ao formulário sem salvar', async () => {
    await renderForm(<VitalEntryForm memberId="m1" kind="height" onSaved={onSaved} />);
    await fireEvent.changeText(screen.getByTestId('vital-value'), '17');
    await activate(screen.getByRole('button', { name: 'Salvar medida' }));
    await activate(await screen.findByRole('button', { name: 'Corrigir' }));
    expect(screen.queryByText(/Confira o valor/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Salvar medida' })).toBeOnTheScreen();
    expect(createMany).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('nos limites exatos de digitação salva sem pedir conferência', async () => {
    await renderForm(<VitalEntryForm memberId="m1" kind="bp" onSaved={onSaved} />);
    await fireEvent.changeText(screen.getByTestId('vital-systolic'), '300');
    await fireEvent.changeText(screen.getByTestId('vital-diastolic'), '30');
    await activate(screen.getByRole('button', { name: 'Salvar medida' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(screen.queryByText(/Confira o valor/)).toBeNull();
  });

  it('valor inválido e hora inválida pedem correção sem salvar', async () => {
    await renderForm(<VitalEntryForm memberId="m1" kind="weight" onSaved={onSaved} />);
    await fireEvent.changeText(screen.getByTestId('vital-value'), 'abc');
    await activate(screen.getByRole('button', { name: 'Salvar medida' }));
    expect(await screen.findByText('Digite um número, por exemplo 13,2.')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByTestId('vital-value'), '70');
    await fireEvent.changeText(screen.getByTestId('vital-time'), '25:00');
    await activate(screen.getByRole('button', { name: 'Salvar medida' }));
    expect(await screen.findByText('Informe uma hora válida.')).toBeOnTheScreen();
    expect(createMany).not.toHaveBeenCalled();
  });

  it('S3/§3.2: mostra A4 e nenhuma palavra vetada, faixa ou IMC', async () => {
    const { toJSON } = await renderForm(<VitalEntryForm memberId="m1" kind="weight" onSaved={onSaved} />);
    expect(screen.getByText(A4)).toBeOnTheScreen();
    const texts = textsOf(toJSON()).join(' | ');
    expect(texts).not.toMatch(VETADAS);
    expect(texts).not.toMatch(/faixa/i);
  });
});
