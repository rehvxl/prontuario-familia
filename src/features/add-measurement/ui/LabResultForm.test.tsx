import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Family } from '@/entities/family';
import type { HealthRecord } from '@/entities/health-record';
import type { Measurement, NewMeasurement } from '@/entities/measurement';
import { renderWithDependencies } from '@/shared/lib/testing';
import { ThemeProvider } from '@/shared/ui';
import { LabResultForm } from './LabResultForm';

jest.mock('@/shared/ui/components/BottomSheet.ios', () => jest.requireActual('@/shared/ui/components/BottomSheet.tsx'));

const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const activate = (element: Parameters<typeof fireEvent>[0]) => fireEvent(element, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
/** `Select` no iOS monta o menu nativo depois de medir o campo; o teste mede e dispara a ação como o sistema. */
const chooseOption = async (frameTestID: string, name: RegExp, value: string) => {
  await fireEvent(screen.getByTestId(frameTestID), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 48 } } });
  await fireEvent(await screen.findByRole('button', { name }), 'pressAction', { nativeEvent: { event: value } });
};

const family: Family = { id: 'fam', name: 'Souza', createdAt: '2026-01-01T00:00:00.000Z', myRole: 'owner' };
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
const saved = (input: NewMeasurement, id = 'new'): Measurement => ({ ...input, id, createdAt: '2026-11-11T12:00:00.000Z', updatedAt: '2026-11-11T12:00:00.000Z' });
const existing: Measurement = saved(
  {
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
    sourceRecordId: 'r1',
    origin: 'ocr',
  },
  'h4',
);

async function setup(props: { measurement?: Measurement } = {}) {
  const repo = {
    createMany: jest.fn(async (items: NewMeasurement[]) => items.map((m) => saved(m))),
    update: jest.fn(async (id: string, changes: Partial<Measurement>) => ({ ...existing, ...changes, id })),
  };
  const onSaved = jest.fn();
  const { wrapper: Wrapper } = renderWithDependencies({
    measurements: repo,
    families: { getMyFamily: async () => family },
    records: { list: async () => [record] },
  });
  const view = await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <ThemeProvider scheme="light" reducedMotion>
        <Wrapper>
          <LabResultForm memberId="carlos" onSaved={onSaved} measurement={props.measurement} />
        </Wrapper>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  return { repo, onSaved, view };
}

const save = (label = 'Salvar resultado') => activate(screen.getByRole('button', { name: label }));

beforeEach(() => {
  // Hoje = 11/11/2026; só a data é falsa (timers reais para o TanStack Query e o waitFor).
  jest.useFakeTimers({
    now: new Date(2026, 10, 11, 9, 30),
    doNotFake: ['hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
  });
});
afterEach(() => jest.useRealTimers());

describe('LabResultForm — "Adicionar resultado" (spec F2.5)', () => {
  it('exame do catálogo com busca, unidade sugerida, faixa do laudo, data de hoje e documento de origem', async () => {
    const { repo, onSaved } = await setup();
    await fireEvent.changeText(screen.getByTestId('lab-exam-search'), 'glicada');
    await fireEvent.press(await screen.findByTestId('lab-exam-hba1c'));
    expect(screen.getByRole('button', { name: 'Exame: Hemoglobina glicada (HbA1c). Trocar exame' })).toBeTruthy();
    expect(screen.getByTestId('lab-unit').props.value).toBe('%');
    expect(screen.getByRole('button', { name: 'Data da coleta: 11 de novembro de 2026' })).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('lab-value'), '7,4');
    await fireEvent.changeText(screen.getByTestId('lab-low'), '4');
    await fireEvent.changeText(screen.getByTestId('lab-high'), '5,6');
    await screen.findByRole('button', { name: /Documento de origem/ });
    await chooseOption('lab-document-frame', /Documento de origem/, 'r1');
    await save();

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(repo.createMany).toHaveBeenCalledWith([
      {
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
        takenOn: '2026-11-11',
        takenAt: null,
        context: null,
        note: null,
        sourceRecordId: 'r1',
        origin: 'manual',
      },
    ]);
  });

  it('"Outro exame" pede o nome, aceita unidade e faixa em texto do laudo', async () => {
    const { repo, onSaved } = await setup();
    await screen.findByTestId('lab-exam-other');
    await fireEvent.press(screen.getByTestId('lab-exam-other'));
    await fireEvent.changeText(screen.getByTestId('lab-value'), '12');
    await save();
    expect(await screen.findByText('Informe o nome do exame.')).toBeTruthy();
    expect(repo.createMany).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('lab-name'), 'Anti-HBs');
    await fireEvent.changeText(screen.getByTestId('lab-unit'), 'mUI/mL');
    await fireEvent.changeText(screen.getByTestId('lab-reference-text'), 'Reagente: > 10');
    await save();
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(repo.createMany.mock.calls[0]![0]![0]).toMatchObject({ code: 'other', label: 'Anti-HBs', value: 12, unit: 'mUI/mL', referenceText: 'Reagente: > 10', referenceLow: null, referenceHigh: null, sourceRecordId: null });
  });

  it('sem exame escolhido, não salva e pede o exame', async () => {
    const { repo } = await setup();
    await screen.findByTestId('lab-exam-other');
    await fireEvent.changeText(screen.getByTestId('lab-value'), '7,4');
    await save();
    expect(await screen.findByText('Escolha o exame.')).toBeTruthy();
    expect(repo.createMany).not.toHaveBeenCalled();
  });

  it.each([['abc'], ['0'], ['-3'], ['']])('F2.6: valor "%s" não salva e diz "Digite um número, por exemplo 13,2."', async (typed) => {
    const { repo, onSaved } = await setup();
    await fireEvent.changeText(screen.getByTestId('lab-exam-search'), 'hemoglobina');
    await fireEvent.press(await screen.findByTestId('lab-exam-hemoglobin'));
    await fireEvent.changeText(screen.getByTestId('lab-value'), typed);
    await save();
    expect(await screen.findByText('Digite um número, por exemplo 13,2.')).toBeTruthy();
    expect(repo.createMany).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('faixa com mínimo maior que o máximo não salva', async () => {
    const { repo } = await setup();
    await fireEvent.changeText(screen.getByTestId('lab-exam-search'), 'creatinina');
    await fireEvent.press(await screen.findByTestId('lab-exam-creatinine'));
    await fireEvent.changeText(screen.getByTestId('lab-value'), '1,1');
    await fireEvent.changeText(screen.getByTestId('lab-low'), '1,3');
    await fireEvent.changeText(screen.getByTestId('lab-high'), '0,7');
    await save();
    expect(await screen.findByText('O mínimo da faixa precisa ser menor ou igual ao máximo.')).toBeTruthy();
    expect(repo.createMany).not.toHaveBeenCalled();
  });

  it('trocar o exame volta para a busca', async () => {
    await setup();
    await fireEvent.changeText(screen.getByTestId('lab-exam-search'), 'tsh');
    await fireEvent.press(await screen.findByTestId('lab-exam-tsh'));
    await fireEvent.press(screen.getByRole('button', { name: 'Exame: TSH. Trocar exame' }));
    expect(screen.getByTestId('lab-exam-search')).toBeTruthy();
  });
});

describe('LabResultForm — editar resultado (spec F2.9)', () => {
  it('abre com os valores do resultado, mantém o exame e grava só as mudanças permitidas', async () => {
    const { repo, onSaved } = await setup({ measurement: existing });
    expect(screen.getByLabelText('Exame: Hemoglobina glicada (HbA1c)')).toBeTruthy();
    expect(screen.queryByTestId('lab-exam-search')).toBeNull();
    expect(screen.queryByRole('button', { name: /Documento de origem/ })).toBeNull();
    expect(screen.getByTestId('lab-value').props.value).toBe('7,4');
    expect(screen.getByTestId('lab-low').props.value).toBe('4');
    expect(screen.getByTestId('lab-high').props.value).toBe('5,6');

    await fireEvent.changeText(screen.getByTestId('lab-value'), '7,1');
    await save('Salvar alterações');
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(repo.update).toHaveBeenCalledWith('h4', {
      label: 'Hemoglobina glicada (HbA1c)',
      value: 7.1,
      unit: '%',
      referenceLow: 4,
      referenceHigh: 5.6,
      referenceText: null,
      takenOn: '2026-10-12',
    });
    expect(repo.createMany).not.toHaveBeenCalled();
  });

  it('F2.6 também na edição', async () => {
    const { repo } = await setup({ measurement: existing });
    await fireEvent.changeText(screen.getByTestId('lab-value'), 'sete');
    await save('Salvar alterações');
    expect(await screen.findByText('Digite um número, por exemplo 13,2.')).toBeTruthy();
    expect(repo.update).not.toHaveBeenCalled();
  });
});
