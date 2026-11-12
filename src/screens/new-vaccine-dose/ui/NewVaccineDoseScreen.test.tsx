import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DEPENDENCY_KEYS } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { ThemeProvider } from '@/shared/ui';
import { createLocalMemberRepository, type Member } from '@/entities/member';
import { createLocalVaccineDoseRepository, type VaccineDoseRepository } from '@/entities/vaccine';
import { NewVaccineDoseScreen } from './NewVaccineDoseScreen';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/shared/ui/components/BottomSheet.ios', () => jest.requireActual('@/shared/ui/components/BottomSheet.tsx'));

beforeAll(() => {
  jest.useFakeTimers({
    now: new Date('2026-11-11T12:00:00'),
    doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'hrtime', 'performance'],
  });
});
afterAll(() => jest.useRealTimers());

const activate = (element: Parameters<typeof fireEvent>[0]) => fireEvent(element, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

let vaccines: VaccineDoseRepository;
let member: Member;

/** `prepare` roda com a base pronta (pode gravar doses) e devolve os parâmetros da rota. */
async function renderSheet(prepare: (m: Member) => Record<string, string> | Promise<Record<string, string>>) {
  const db = createMemoryDb();
  const members = createLocalMemberRepository(db);
  vaccines = createLocalVaccineDoseRepository(db);
  member = await members.create({ familyId: 'f1', fullName: 'Dirce Almeida', birthDate: '1952-02-01', relationship: 'parent', sex: 'female' });
  mockParams = await prepare(member);
  const { wrapper: Wrapper } = renderWithDependencies({ [DEPENDENCY_KEYS.members]: members, [DEPENDENCY_KEYS.vaccineDoses]: vaccines });
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <ThemeProvider scheme="light" reducedMotion>
        <Wrapper>
          <NewVaccineDoseScreen />
        </Wrapper>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

/** Select no iOS só monta o menu nativo depois de medir a largura; então dispara a ação como o sistema faria. */
async function choose(testID: string, name: RegExp, value: string) {
  await fireEvent(screen.getByTestId(`${testID}-frame`), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 48 } } });
  await fireEvent(await screen.findByRole('button', { name }), 'pressAction', { nativeEvent: { event: value } });
}

/** "Salvar dose" fica desabilitado até a pessoa carregar (familyId); espera habilitar, como um toque real. */
const save = async () => {
  await waitFor(() => expect(screen.getByTestId('dose-save').props.accessibilityState?.disabled).toBe(false));
  await act(async () => activate(screen.getByTestId('dose-save')));
};

beforeEach(() => jest.clearAllMocks());

describe('Nova dose (F3.5)', () => {
  it('pede vacina, dose e data ou "Não sei a data"; lote e local são opcionais', async () => {
    await renderSheet((m) => ({ memberId: m.id }));
    expect(await screen.findByText('Nova dose')).toBeTruthy();
    await save();
    expect(await screen.findByText('Escolha a vacina.')).toBeTruthy();
    expect(screen.getByText('Escolha a dose.')).toBeTruthy();
    expect(screen.getByText('Escolha a data ou marque “Não sei a data”.')).toBeTruthy();
    expect(screen.getByText(/^Lote/)).toBeTruthy();
    expect(screen.getByText(/^Local/)).toBeTruthy();
    expect(await vaccines.listByMember(member.id)).toEqual([]);
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('as doses oferecidas usam os rótulos da spec', async () => {
    await renderSheet((m) => ({ memberId: m.id }));
    await fireEvent(await screen.findByTestId('dose-key-frame'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 48 } } });
    for (const label of ['1ª dose', '2ª dose', 'Reforço', 'Dose única', 'Anual']) {
      await fireEvent(screen.getByRole('button', { name: /^Dose:/ }), 'pressAction', { nativeEvent: { event: { '1ª dose': 'D1', '2ª dose': 'D2', Reforço: 'R', 'Dose única': 'DU', Anual: 'ANUAL' }[label] } });
      expect(screen.getByRole('button', { name: `Dose: ${label}` })).toBeTruthy();
    }
  });

  it('com "Não sei a data", salva sem data e fecha a folha', async () => {
    await renderSheet((m) => ({ memberId: m.id }));
    await choose('dose-vaccine', /^Vacina:/, 'yellow_fever');
    await choose('dose-key', /^Dose:/, 'DU');
    await fireEvent.changeText(screen.getByTestId('dose-lot'), 'FA123');
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Não sei a data' }));
    await save();
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(await vaccines.listByMember(member.id)).toEqual([
      expect.objectContaining({ vaccineCode: 'yellow_fever', doseKey: 'DU', doseLabel: 'Dose única', appliedOn: null, lot: 'FA123', location: null, origin: 'manual' }),
    ]);
  });

  it('com data: o calendário vai até hoje e a data escolhida é salva', async () => {
    await renderSheet((m) => ({ memberId: m.id }));
    await choose('dose-vaccine', /^Vacina:/, 'influenza');
    await choose('dose-key', /^Dose:/, 'ANUAL');
    await fireEvent.press(screen.getByRole('button', { name: /^Data da aplicação/ }));
    await activate(await screen.findByRole('button', { name: 'Concluir' }));
    await save();
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(await vaccines.listByMember(member.id)).toEqual([expect.objectContaining({ vaccineCode: 'influenza', appliedOn: '2026-11-11', doseLabel: 'Anual' })]);
  });

  it('"Outra" pede o nome da vacina', async () => {
    await renderSheet((m) => ({ memberId: m.id }));
    await choose('dose-vaccine', /^Vacina:/, 'other');
    await choose('dose-key', /^Dose:/, 'D1');
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Não sei a data' }));
    await save();
    expect(await screen.findByText('Digite o nome da vacina.')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('dose-vaccine-name'), 'Herpes-zóster');
    await save();
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(await vaccines.listByMember(member.id)).toEqual([expect.objectContaining({ vaccineCode: 'other', vaccineName: 'Herpes-zóster' })]);
  });

  it('dose repetida mostra a mensagem do domínio e não fecha', async () => {
    await renderSheet((m) => ({ memberId: m.id }));
    await vaccines.createMany([
      { familyId: 'f1', memberId: member.id, vaccineCode: 'bcg', vaccineName: null, doseKey: 'DU', doseLabel: 'Dose única', appliedOn: '2026-11-11', lot: null, location: null, sourceRecordId: null, origin: 'manual' },
    ]);
    await choose('dose-vaccine', /^Vacina:/, 'bcg');
    await choose('dose-key', /^Dose:/, 'DU');
    await fireEvent.press(screen.getByRole('button', { name: /^Data da aplicação/ }));
    await activate(await screen.findByRole('button', { name: 'Concluir' }));
    await save();
    expect(await screen.findByText('Esta dose já está registrada.')).toBeTruthy();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});

describe('Editar dose (padrão F2.9)', () => {
  const dt = (memberId: string) => ({
    familyId: 'f1', memberId, vaccineCode: 'dt', vaccineName: null, doseKey: 'D1' as const, doseLabel: '1ª dose',
    appliedOn: null, lot: null, location: 'UBS Centro', sourceRecordId: null, origin: 'manual' as const,
  });

  it('abre com os dados da dose e salva as mudanças', async () => {
    let doseId = '';
    await renderSheet(async (m) => {
      const [created] = await vaccines.createMany([dt(m.id)]);
      doseId = created!.id;
      return { memberId: m.id, doseId };
    });
    expect(await screen.findByText('Editar dose')).toBeTruthy();
    // O título aparece antes; o formulário, quando a dose carrega.
    expect(await screen.findByRole('button', { name: 'Vacina: Dupla adulto (dT)' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Não sei a data' }).props.accessibilityState).toEqual(expect.objectContaining({ checked: true }));
    expect(screen.getByTestId('dose-location').props.value).toBe('UBS Centro');

    await choose('dose-key', /^Dose:/, 'R');
    await save();
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(await vaccines.listByMember(member.id)).toEqual([expect.objectContaining({ id: doseId, doseKey: 'R', doseLabel: 'Reforço', appliedOn: null, location: 'UBS Centro' })]);
  });

  it('dose que não existe mais: "Dose não encontrada" com "Fechar"', async () => {
    await renderSheet((m) => ({ memberId: m.id, doseId: 'sumiu' }));
    expect(await screen.findByText('Dose não encontrada')).toBeTruthy();
    await activate(screen.getByRole('button', { name: 'Fechar' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
