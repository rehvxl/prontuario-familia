import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createLocalMedicationRepository, type Medication } from '@/entities/medication';
import { createLocalMemberRepository } from '@/entities/member';
import { DEPENDENCY_KEYS, LOCAL_COLLECTIONS, type LocalDb } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { ThemeProvider } from '@/shared/ui';
import { NewMedicationScreen } from './NewMedicationScreen';

// "Hoje" fixo da spec: 11/11/2026 (padrão do campo Início).
jest.mock('@/shared/lib', () => ({ ...jest.requireActual('@/shared/lib'), toLocalIsoDate: () => '2026-11-11' }));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => ({ memberId: 'm1' }) }));
jest.mock('@/shared/ui/components/BottomSheet.ios', () => jest.requireActual('@/shared/ui/components/BottomSheet.tsx'));
jest.mock('@react-native-community/datetimepicker', () => {
  /* eslint-disable @typescript-eslint/no-require-imports -- fábrica de jest.mock */
  const React = require('react');
  const { TextInput } = require('react-native');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const Picker = ({ onValueChange }: { onValueChange: (e: unknown, d: Date) => void }) =>
    React.createElement(TextInput, { testID: 'date-picker', onChangeText: (t: string) => onValueChange({}, new Date(`${t}T12:00:00`)) });
  return { __esModule: true, default: Picker, DateTimePickerAndroid: { open: jest.fn() } };
});

const activate = (el: Parameters<typeof fireEvent>[0]) => fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

async function setup() {
  const db: LocalDb = createMemoryDb();
  await db.put(LOCAL_COLLECTIONS.members, 'm1', { id: 'm1', familyId: 'f1', fullName: 'Ana Souza', birthDate: null, relationship: 'self', sex: 'female', createdAt: '2026-01-01T00:00:00.000Z' });
  const { wrapper: Wrapper } = renderWithDependencies({
    [DEPENDENCY_KEYS.members]: createLocalMemberRepository(db),
    [DEPENDENCY_KEYS.medications]: createLocalMedicationRepository(db),
  });
  await render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
      <ThemeProvider scheme="light" reducedMotion>
        <Wrapper>
          <NewMedicationScreen />
        </Wrapper>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  // O membro carrega antes de o salvar ser liberado.
  await waitFor(() => expect(screen.getByTestId('save-medication')).not.toBeDisabled());
  return db;
}

const saved = (db: LocalDb) => db.list<Medication>(LOCAL_COLLECTIONS.medications);

async function pickDate(fieldTestID: string, iso: string) {
  await fireEvent.press(screen.getByTestId(fieldTestID));
  await fireEvent.changeText(screen.getByTestId('date-picker'), iso);
  await activate(screen.getByRole('button', { name: 'Concluir' }));
}

beforeEach(() => jest.clearAllMocks());

describe('NewMedicationScreen (spec F4.3, F4.5)', () => {
  it('F4.3: exige nome e a escolha de duração; nada começa escolhido', async () => {
    const db = await setup();
    expect(screen.getByText('Novo medicamento')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Início: 11 de novembro de 2026' })).toBeTruthy();
    for (const label of ['Uso contínuo', 'Até uma data', 'Por um número de dias']) {
      expect(screen.getByRole('radio', { name: label })).not.toBeChecked();
    }

    await activate(screen.getByTestId('save-medication'));
    expect(await screen.findByText('Informe o nome do medicamento.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('medication-name'), 'Losartana');
    await activate(screen.getByTestId('save-medication'));
    expect(await screen.findByText('Escolha por quanto tempo.')).toBeTruthy();
    expect(await saved(db)).toEqual([]);
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('"Uso contínuo" grava endOn null com dosagem e instrução, e fecha a folha', async () => {
    const db = await setup();
    await fireEvent.changeText(screen.getByTestId('medication-name'), '  Losartana ');
    await fireEvent.changeText(screen.getByTestId('medication-dosage'), '50 mg');
    await fireEvent.changeText(screen.getByTestId('medication-instructions'), '1 comprimido pela manhã');
    await fireEvent.press(screen.getByRole('radio', { name: 'Uso contínuo' }));
    expect(screen.getByRole('radio', { name: 'Uso contínuo' })).toBeChecked();
    await activate(screen.getByTestId('save-medication'));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect(await saved(db)).toEqual([
      expect.objectContaining({ name: 'Losartana', dosage: '50 mg', instructions: '1 comprimido pela manhã', startOn: '2026-11-11', endOn: null, origin: 'manual', sourceRecordId: null, familyId: 'f1', memberId: 'm1' }),
    ]);
  });

  it('F4.2/R6: Amoxicilina "por 7 dias" a partir de 05/11 termina em 11/11', async () => {
    const db = await setup();
    await fireEvent.changeText(screen.getByTestId('medication-name'), 'Amoxicilina');
    await pickDate('medication-start', '2026-11-05');
    await fireEvent.press(screen.getByRole('radio', { name: 'Por um número de dias' }));
    await fireEvent.changeText(screen.getByTestId('medication-days'), '7');
    expect(screen.getByText('Até 11 de nov. de 2026')).toBeTruthy();
    await activate(screen.getByTestId('save-medication'));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(await saved(db)).toEqual([expect.objectContaining({ name: 'Amoxicilina', startOn: '2026-11-05', endOn: '2026-11-11' })]);
  });

  it('"Por {n} dias" sem número válido não salva', async () => {
    const db = await setup();
    await fireEvent.changeText(screen.getByTestId('medication-name'), 'Amoxicilina');
    await fireEvent.press(screen.getByRole('radio', { name: 'Por um número de dias' }));
    await fireEvent.changeText(screen.getByTestId('medication-days'), '0');
    await activate(screen.getByTestId('save-medication'));
    expect(await screen.findByText('Informe o número de dias.')).toBeTruthy();
    expect(await saved(db)).toEqual([]);
  });

  it('F4.5: "Até {data}" antes do início não salva e diz o motivo', async () => {
    const db = await setup();
    await fireEvent.changeText(screen.getByTestId('medication-name'), 'Prednisona');
    await fireEvent.press(screen.getByRole('radio', { name: 'Até uma data' }));
    await pickDate('medication-end', '2026-11-20');
    // A pessoa muda o início depois do término.
    await pickDate('medication-start', '2026-11-25');
    await activate(screen.getByTestId('save-medication'));
    expect(await screen.findByText('A data de término precisa ser igual ou posterior ao início.')).toBeTruthy();
    expect(await saved(db)).toEqual([]);

    await pickDate('medication-end', '2026-11-25');
    await activate(screen.getByTestId('save-medication'));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(await saved(db)).toEqual([expect.objectContaining({ startOn: '2026-11-25', endOn: '2026-11-25' })]);
  });

  it('F4.6: a folha mostra a A5', async () => {
    await setup();
    expect(screen.getByText('Lista para consulta. Não mude o tratamento sem falar com o profissional de saúde.')).toBeTruthy();
  });
});
