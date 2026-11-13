import type { ReactElement } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DEPENDENCY_KEYS } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { ThemeProvider } from '@/shared/ui';
import { createLocalHealthRecordRepository } from '@/entities/health-record';
import { createLocalMemberRepository, type Member } from '@/entities/member';
import { createLocalVaccineDoseRepository, type NewVaccineDose, type VaccineDoseRepository } from '@/entities/vaccine';
import { VaccineDoseForm } from '@/features/record-vaccine-dose';
import { MemberVaccinesScreen } from './MemberVaccinesScreen';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
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
// Folhas nativas do SwiftUI não têm árvore RN tocável: nos testes usa as variantes em React Native.
jest.mock('@/shared/ui/components/BottomSheet.ios', () => jest.requireActual('@/shared/ui/components/BottomSheet.tsx'));
jest.mock('@/shared/ui/components/ActionSheet.ios', () => jest.requireActual('@/shared/ui/components/ActionSheet.tsx'));

// Hoje = 11/11/2026 (spec F3.3). Só o relógio é falso; os temporizadores continuam reais.
const NOW = new Date('2026-11-11T12:00:00');
beforeAll(() => {
  jest.useFakeTimers({
    now: NOW,
    doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'hrtime', 'performance'],
  });
});
afterAll(() => jest.useRealTimers());

/** Botões SwiftUI (Button no iOS) são acionados pela ação de acessibilidade, como o VoiceOver faz. */
const activate = (element: Parameters<typeof fireEvent>[0]) => fireEvent(element, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const VETOED = /\b(normal|anormal|alterad[oa]|grave|crítico|risco|perigo|alerta|urgente|preocupante|saudável|doente|bom|ruim)\b|!/i;

let vaccines: VaccineDoseRepository;
let member: Member;

async function setup(birthDate: string | null, fullName = 'Lia Souza') {
  const db = createMemoryDb();
  const members = createLocalMemberRepository(db);
  vaccines = createLocalVaccineDoseRepository(db);
  member = await members.create({ familyId: 'f1', fullName, birthDate, relationship: 'child', sex: 'female' });
  mockParams = { id: member.id };
  return renderWithDependencies({
    [DEPENDENCY_KEYS.members]: members,
    [DEPENDENCY_KEYS.vaccineDoses]: vaccines,
    [DEPENDENCY_KEYS.records]: createLocalHealthRecordRepository(db),
  });
}

function dose(vaccineCode: string, appliedOn: string | null, extra: Partial<NewVaccineDose> = {}): NewVaccineDose {
  return {
    familyId: 'f1',
    memberId: member.id,
    vaccineCode,
    vaccineName: null,
    doseKey: 'D1',
    doseLabel: '1ª dose',
    appliedOn,
    lot: null,
    location: null,
    sourceRecordId: null,
    origin: 'manual',
    ...extra,
  };
}

async function show(ui: ReactElement, wrapper: ReturnType<typeof renderWithDependencies>['wrapper']) {
  const Wrapper = wrapper;
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <ThemeProvider scheme="light" reducedMotion>
        <Wrapper>{ui}</Wrapper>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  await screen.findByText('Carteira de vacinas');
}

const section = (id: string) => within(screen.getByTestId(id));
const rowIds = (prefix: string) =>
  screen
    .queryAllByTestId(new RegExp(`^${prefix}-`))
    .map((el) => el.props.testID as string)
    .filter((tid, i, all) => all.indexOf(tid) === i);
type Node = string | { props?: { accessibilityLabel?: string }; children?: Node[] | null } | Node[] | null;
/** Todo texto visível e todo rótulo de acessibilidade da árvore renderizada. */
const allText = () => {
  const out: string[] = [];
  const walk = (n: Node | undefined): void => {
    if (!n) return;
    if (typeof n === 'string') out.push(n);
    else if (Array.isArray(n)) n.forEach(walk);
    else {
      if (n.props?.accessibilityLabel) out.push(n.props.accessibilityLabel);
      n.children?.forEach(walk);
    }
  };
  walk(screen.toJSON() as Node);
  return out.join('\n');
};

beforeEach(() => {
  jest.clearAllMocks();
});

const LIA = '2026-01-10'; // 10 meses em 11/11/2026

describe('carteira de vacinas (F3)', () => {
  it('F3.1: Pendências, Aplicadas e Calendário para a idade nesta ordem; pendências de Atrasada a Próxima', async () => {
    const { wrapper } = await setup(LIA);
    await vaccines.createMany([dose('bcg', '2026-01-11', { doseKey: 'DU', doseLabel: 'Dose única' }), dose('penta', null)]);
    await show(<MemberVaccinesScreen />, wrapper);
    await screen.findByTestId('section-pending');

    const headers = screen.getAllByRole('header').map((h) => [h.props.children].flat().join(''));
    expect(headers.filter((h) => ['Pendências', 'Aplicadas', 'Calendário para a idade'].includes(h))).toEqual(['Pendências', 'Aplicadas', 'Calendário para a idade']);

    const order = ['Atrasada pelo calendário', 'Pendente', 'Confirmar na carteira', 'Próxima'];
    const statuses = section('section-pending')
      .getAllByText(/^(Atrasada pelo calendário|Pendente|Confirmar na carteira|Próxima)$/)
      .map((t) => t.props.children as string);
    expect(statuses.length).toBeGreaterThan(0);
    expect([...statuses].sort((x, y) => order.indexOf(x) - order.indexOf(y))).toEqual(statuses);

    // Aplicadas: a mais recente primeiro, "Data não informada" por último.
    const applied = section('section-applied').getAllByText(/ · (\d+ de|Data não informada)/).map((t) => t.props.children as string);
    expect(applied).toEqual(['Dose única · 11 de jan. de 2026', '1ª dose · Data não informada']);
    expect(screen.getByLabelText('2 doses registradas')).toBeTruthy();
    expect(screen.getByLabelText('1 data não informada')).toBeTruthy();
  });

  it('F3.2: mostra A3 e A13', async () => {
    const { wrapper } = await setup(LIA);
    await show(<MemberVaccinesScreen />, wrapper);
    expect(
      await screen.findByText('Referência do calendário público. Confirme com o profissional de saúde. As pendências consideram só as doses registradas no app.'),
    ).toBeTruthy();
  });

  it('F3.3: exemplos de limite com Lia (10 meses) e a data por extenso da F3.9', async () => {
    const { wrapper } = await setup(LIA);
    await show(<MemberVaccinesScreen />, wrapper);
    const penta = await screen.findByTestId('pending-penta_d3');
    expect(within(penta).getByText('Atrasada pelo calendário')).toBeTruthy();
    expect(within(penta).getByText('3ª dose · a partir de 10 de jul. de 2026')).toBeTruthy();
    const yellowFever = screen.getByTestId('pending-yellow_fever_d1');
    expect(within(yellowFever).getByText('Atrasada pelo calendário')).toBeTruthy();
    // SCR D1 aos 12 meses: faltam 60 dias → Prevista, só no calendário (F3.9: "a partir de 10 de jan. de 2027").
    const mmr = screen.getByTestId('calendar-mmr_d1');
    expect(within(mmr).getByText('Prevista')).toBeTruthy();
    expect(within(mmr).getByText('1ª dose · a partir de 10 de jan. de 2027')).toBeTruthy();
    expect(rowIds('pending')).not.toContain('pending-mmr_d1');
  });

  it('calendário para a idade: o bebê de 10 meses não vê regras de adulto nem o reforço de dT', async () => {
    const { wrapper } = await setup(LIA);
    await show(<MemberVaccinesScreen />, wrapper);
    await screen.findByTestId('section-calendar');
    const ids = rowIds('calendar');
    expect(ids).toContain('calendar-penta_d3');
    for (const id of ['dt_booster', 'dt_basic', 'hepatitis_b_history', 'hpv4_du', 'influenza_elder']) expect(ids).not.toContain(`calendar-${id}`);
  });

  it('dT com dose registrada: o esquema básico não aparece nas pendências, só no calendário como Confirmar na carteira', async () => {
    const { wrapper } = await setup('1986-05-20', 'Ana Souza');
    await vaccines.createMany([dose('dt', '2020-01-01', { doseKey: 'R', doseLabel: 'Reforço' })]);
    await show(<MemberVaccinesScreen />, wrapper);
    await screen.findByTestId('section-pending');
    expect(rowIds('pending')).not.toContain('pending-dt_basic');
    expect(within(screen.getByTestId('calendar-dt_basic')).getByText('Confirmar na carteira')).toBeTruthy();
    expect(within(screen.getByTestId('calendar-dt_booster')).getByText('Reforço · a partir de 1 de jan. de 2030')).toBeTruthy();
  });

  it('F3.4: sem data de nascimento mostra A12 com "Adicionar data de nascimento" e nenhuma pendência', async () => {
    const { wrapper } = await setup(null, 'Dirce Almeida');
    await vaccines.createMany([dose('influenza', '2026-04-15', { doseKey: 'ANUAL', doseLabel: 'Anual' })]);
    await show(<MemberVaccinesScreen />, wrapper);
    expect(await screen.findByText('Adicione a data de nascimento de Dirce para ver as vacinas do calendário.')).toBeTruthy();
    expect(screen.queryByTestId('section-pending')).toBeNull();
    expect(screen.queryByTestId('section-calendar')).toBeNull();
    expect(screen.getByText('Anual · 15 de abr. de 2026')).toBeTruthy();
    await activate(screen.getByRole('button', { name: 'Adicionar data de nascimento' }));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(main)/member/[id]/edit', params: { id: member.id } });
  });

  it('F3.5: "Registrar dose" abre a folha da pessoa', async () => {
    const { wrapper } = await setup(LIA);
    await show(<MemberVaccinesScreen />, wrapper);
    await fireEvent.press(await screen.findByRole('button', { name: 'Registrar dose' })); // botão "+" da barra
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(main)/vaccine-dose/new', params: { memberId: member.id } });
  });

  it('F3.6: ao salvar uma dose, as pendências são recalculadas na mesma tela', async () => {
    const { wrapper } = await setup(LIA);
    await show(
      <>
        <MemberVaccinesScreen />
        <VaccineDoseForm memberId={member.id} onSaved={jest.fn()} />
      </>,
      wrapper,
    );
    await screen.findByTestId('pending-yellow_fever_d1');
    // Select no iOS só monta o menu nativo depois de medir a largura do campo.
    const choose = async (testID: string, name: RegExp, value: string) => {
      await fireEvent(screen.getByTestId(`${testID}-frame`), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 48 } } });
      await fireEvent(await screen.findByRole('button', { name }), 'pressAction', { nativeEvent: { event: value } });
    };
    await choose('dose-vaccine', /^Vacina:/, 'yellow_fever');
    await choose('dose-key', /^Dose:/, 'D1');
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Não sei a data' }));
    await act(async () => activate(screen.getByTestId('dose-save')));
    await waitFor(() => expect(screen.queryByTestId('pending-yellow_fever_d1')).toBeNull());
    expect(within(screen.getByTestId('calendar-yellow_fever_d1')).getByText('Aplicada')).toBeTruthy();
    expect(screen.getByText('1ª dose · Data não informada')).toBeTruthy();
  });

  it('F3.7: "Não se aplica" pede o motivo, move o item e oferece "Desfazer"', async () => {
    const { wrapper } = await setup('2024-01-10'); // varicela D1 aos 15 m, pendente
    await show(<MemberVaccinesScreen />, wrapper);
    await fireEvent.press(await screen.findByTestId('pending-varicella_d1'));
    await fireEvent.press(await screen.findByRole('button', { name: 'Não se aplica' }));
    const sheet = await screen.findByTestId('dismiss-rule-sheet');
    for (const reason of ['Já teve a doença', 'Orientação do profissional de saúde', 'Outro']) expect(within(sheet).getByRole('radio', { name: reason })).toBeTruthy();

    await activate(within(sheet).getByTestId('dismiss-save'));
    expect(await within(sheet).findByText('Escolha o motivo.')).toBeTruthy();
    await fireEvent.press(within(sheet).getByRole('radio', { name: 'Já teve a doença' }));
    await act(async () => activate(within(sheet).getByTestId('dismiss-save')));

    const moved = await screen.findByTestId('not-applicable-varicella_d1');
    expect(within(moved).getByText('1ª dose · Já teve a doença')).toBeTruthy();
    expect(rowIds('pending')).not.toContain('pending-varicella_d1');

    await act(async () => activate(screen.getByRole('button', { name: 'Desfazer: Varicela' })));
    await waitFor(() => expect(screen.queryByTestId('not-applicable-varicella_d1')).toBeNull());
    expect(await screen.findByTestId('pending-varicella_d1')).toBeTruthy();
  });

  it('F3.8: regras não automáticas aparecem em "Outras indicações do calendário" com a observação, sem pendência', async () => {
    const { wrapper } = await setup('1988-03-15', 'Ana Souza');
    await show(<MemberVaccinesScreen />, wrapper);
    const other = await screen.findByTestId('section-other');
    expect(within(other).getByText('Na gestação, a partir da 28ª semana: 1 dose em cada gestação.')).toBeTruthy();
    expect(rowIds('pending').some((id) => id.includes('pregnancy'))).toBe(false);
  });

  it('estado vazio com o nome da pessoa', async () => {
    const { wrapper } = await setup('1950-03-01', 'Dirce Almeida');
    await show(<MemberVaccinesScreen />, wrapper);
    expect(await screen.findByText('Nenhuma dose registrada. Registre as vacinas que já estão na carteira de Dirce.')).toBeTruthy();
    // Influenza de 2026 (R12), com a contagem do ano.
    const flu = screen.getByTestId('pending-influenza_elder');
    expect(within(flu).getByText('Influenza de 2026')).toBeTruthy();
    expect(within(flu).getByText('Nenhuma dose registrada em 2026')).toBeTruthy();
    expect(flu.props.accessibilityLabel).toBe('Influenza de 2026, pendente, Anual, a partir de 1 de jan. de 2026, Nenhuma dose registrada em 2026');
  });

  it('carregando mostra o esqueleto; erro mostra "Tentar de novo" e recupera', async () => {
    const { wrapper } = await setup(LIA);
    let fail = true;
    // A primeira leitura espera a asserção do esqueleto; sem isso a falha às vezes chega antes dela.
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const original = vaccines.listByMember.bind(vaccines);
    vaccines.listByMember = async (id) => {
      await gate;
      if (fail) throw new Error('rede');
      return original(id);
    };
    const Wrapper = wrapper;
    await render(
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <ThemeProvider scheme="light" reducedMotion>
          <Wrapper>
            <MemberVaccinesScreen />
          </Wrapper>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(screen.getByLabelText('Carregando')).toBeTruthy();
    release();
    const retry = await screen.findByRole('button', { name: 'Tentar de novo' });
    fail = false;
    await act(async () => activate(retry));
    expect(await screen.findByTestId('section-pending')).toBeTruthy();
  });

  it('editar e excluir uma dose aplicada (padrão F2.9) com a origem visível', async () => {
    const { wrapper } = await setup(LIA);
    const [bcg] = await vaccines.createMany([dose('bcg', '2026-01-11', { doseKey: 'DU', doseLabel: 'Dose única', lot: 'AB12', location: 'UBS Centro' })]);
    await show(<MemberVaccinesScreen />, wrapper);
    const row = await screen.findByTestId(`dose-${bcg!.id}`);
    expect(within(row).getByText('Lote AB12 · UBS Centro')).toBeTruthy();
    expect(within(row).getByText('Registrado por você')).toBeTruthy();

    await fireEvent.press(row);
    await fireEvent.press(await screen.findByRole('button', { name: 'Editar dose' }));
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(main)/vaccine-dose/new', params: { memberId: member.id, doseId: bcg!.id } }));

    await fireEvent.press(screen.getByTestId(`dose-${bcg!.id}`));
    await fireEvent.press(await screen.findByRole('button', { name: 'Excluir dose' }));
    expect(await screen.findByText('A dose sai da carteira e as pendências são recalculadas. Não dá para desfazer.')).toBeTruthy();
    await act(async () => activate(screen.getByRole('button', { name: 'Excluir dose' })));
    await waitFor(() => expect(screen.queryByTestId(`dose-${bcg!.id}`)).toBeNull());
    expect(await vaccines.listByMember(member.id)).toEqual([]);
  });

  it('calma: nenhum texto da carteira usa palavra vetada nem exclamação', async () => {
    const { wrapper } = await setup('1950-03-01', 'Dirce Almeida');
    await vaccines.createMany([dose('dt', '2014-01-01', { doseKey: 'R', doseLabel: 'Reforço' }), dose('yellow_fever', null, { doseKey: 'DU', doseLabel: 'Dose única' })]);
    await show(<MemberVaccinesScreen />, wrapper);
    await screen.findByTestId('section-pending');
    const text = allText();
    expect(text).toContain('Atrasada pelo calendário');
    expect(text).not.toMatch(VETOED);
  });
});
