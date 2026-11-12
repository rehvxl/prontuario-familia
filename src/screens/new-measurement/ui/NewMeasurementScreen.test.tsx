import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Family } from '@/entities/family';
import type { Measurement } from '@/entities/measurement';
import { renderWithDependencies } from '@/shared/lib/testing';
import { ThemeProvider } from '@/shared/ui';
import { NewMeasurementScreen } from './NewMeasurementScreen';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let mockParams: Record<string, string> = {};
const mockStackScreen = jest.fn();
jest.mock('expo-router', () => ({
  Stack: { Screen: (props: unknown) => (mockStackScreen(props), null) },
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const activate = (element: Parameters<typeof fireEvent>[0]) => fireEvent(element, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
const family: Family = { id: 'fam', name: 'Souza', createdAt: '2026-01-01T00:00:00.000Z', myRole: 'owner' };
const glucose: Measurement = {
  id: 'g1',
  familyId: 'fam',
  memberId: 'carlos',
  kind: 'lab',
  code: 'glucose_fasting',
  label: 'Glicose em jejum',
  value: 92,
  value2: null,
  unit: 'mg/dL',
  referenceLow: 70,
  referenceHigh: 99,
  referenceText: null,
  takenOn: '2026-10-12',
  takenAt: null,
  context: null,
  note: null,
  sourceRecordId: null,
  origin: 'manual',
  createdAt: '2026-10-12T10:00:00.000Z',
  updatedAt: '2026-10-12T10:00:00.000Z',
};

async function renderScreen() {
  const repo = {
    listByMember: jest.fn(async () => [glucose]),
    createMany: jest.fn(async (items: Measurement[]) => items.map((m) => ({ ...m, id: 'new' }))),
    update: jest.fn(async (id: string, changes: Partial<Measurement>) => ({ ...glucose, ...changes, id })),
  };
  const { wrapper: Wrapper } = renderWithDependencies({ measurements: repo, families: { getMyFamily: async () => family }, records: { list: async () => [] } });
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <ThemeProvider scheme="light" reducedMotion>
        <Wrapper>
          <NewMeasurementScreen />
        </Wrapper>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  return repo;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({
    now: new Date(2026, 10, 11, 9, 30),
    doNotFake: ['hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
  });
});
afterEach(() => jest.useRealTimers());

describe('NewMeasurementScreen (folha measurement/new)', () => {
  it('novo resultado: mostra o formulário da pessoa e fecha a folha ao salvar', async () => {
    mockParams = { memberId: 'carlos' };
    const repo = await renderScreen();
    expect(screen.getByTestId('new-measurement-screen')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('lab-exam-search'), 'ferritina');
    await fireEvent.press(await screen.findByTestId('lab-exam-ferritin'));
    await fireEvent.changeText(screen.getByTestId('lab-value'), '45');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar resultado' }).props.accessibilityState?.disabled).toBeFalsy());
    await activate(screen.getByRole('button', { name: 'Salvar resultado' }));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(repo.createMany.mock.calls[0]![0]![0]).toMatchObject({ memberId: 'carlos', familyId: 'fam', code: 'ferritin', value: 45, unit: 'ng/mL', takenOn: '2026-11-11' });
    expect(mockStackScreen).not.toHaveBeenCalled();
  });

  it('com measurementId, edita o resultado e troca o título da folha', async () => {
    mockParams = { memberId: 'carlos', measurementId: 'g1' };
    const repo = await renderScreen();
    expect(await screen.findByRole('button', { name: 'Salvar alterações' })).toBeTruthy();
    expect(mockStackScreen).toHaveBeenCalledWith({ options: { title: 'Editar resultado' } });
    await fireEvent.changeText(screen.getByTestId('lab-value'), '101');
    await activate(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(repo.update).toHaveBeenCalledWith('g1', expect.objectContaining({ value: 101 }));
  });

  it('resultado inexistente: "Resultado não encontrado"', async () => {
    mockParams = { memberId: 'carlos', measurementId: 'nada' };
    await renderScreen();
    expect(await screen.findByText('Resultado não encontrado')).toBeTruthy();
  });

  it('sem pessoa: "Pessoa não encontrada" com voltar', async () => {
    mockParams = {};
    await renderScreen();
    expect(screen.getByText('Pessoa não encontrada')).toBeTruthy();
    await activate(screen.getByRole('button', { name: 'Voltar' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
