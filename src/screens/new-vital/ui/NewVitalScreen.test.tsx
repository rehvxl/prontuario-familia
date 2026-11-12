import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DEPENDENCY_KEYS } from '@/shared/lib';
import { renderWithDependencies } from '@/shared/lib/testing';
import { ThemeProvider } from '@/shared/ui';
import type { Measurement, NewMeasurement } from '@/entities/measurement';
import { NewVitalScreen } from './NewVitalScreen';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => mockParams }));

const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const activate = (element: Parameters<typeof fireEvent>[0]) => fireEvent(element, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

let createMany: jest.Mock<Promise<Measurement[]>, [NewMeasurement[]]>;

async function renderScreen(params: Record<string, string>) {
  mockParams = params;
  createMany = jest.fn(async (items: NewMeasurement[]) => items.map((m) => ({ ...m, id: 'v1', createdAt: '', updatedAt: '' })));
  const { wrapper: Wrapper } = renderWithDependencies({
    [DEPENDENCY_KEYS.members]: { getById: async () => ({ id: 'm1', familyId: 'f1', fullName: 'Carlos Souza' }) },
    [DEPENDENCY_KEYS.measurements]: { listByMember: async () => [], createMany },
  });
  return render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <ThemeProvider scheme="light" reducedMotion>
        <Wrapper>
          <NewVitalScreen />
        </Wrapper>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe('NewVitalScreen', () => {
  it('abre no tipo da rota, salva para a pessoa da rota e fecha a folha', async () => {
    await renderScreen({ memberId: 'm1', kind: 'bp' });
    expect(screen.getByTestId('new-vital-screen')).toBeOnTheScreen();
    await screen.findByText('O app não avalia estes valores. Mostre a sequência ao profissional que acompanha Carlos.');
    expect(screen.getByRole('button', { name: 'Sinal vital: Pressão arterial' })).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('vital-systolic'), '130');
    await fireEvent.changeText(screen.getByTestId('vital-diastolic'), '85');
    await activate(screen.getByRole('button', { name: 'Salvar medida' }));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(createMany.mock.calls[0]![0][0]).toMatchObject({ memberId: 'm1', familyId: 'f1', code: 'bp', value: 130, value2: 85 });
  });

  it('tipo desconhecido na rota deixa a escolha em aberto', async () => {
    await renderScreen({ memberId: 'm1', kind: 'imc' });
    expect(await screen.findByRole('button', { name: 'Sinal vital: nenhum selecionado' })).toBeOnTheScreen();
  });

  it('sem pessoa na rota não abre o formulário', async () => {
    await renderScreen({});
    expect(screen.getByText('Pessoa não encontrada')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Sinal vital/ })).toBeNull();
  });
});
