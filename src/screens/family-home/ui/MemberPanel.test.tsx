import type { ReactNode } from 'react';
import { RAIL_TAB_ROLE , ThemeProvider } from '@/shared/ui';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DEPENDENCY_KEYS } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { createLocalHealthRecordRepository, type NewHealthRecord } from '@/entities/health-record';
import { createLocalMeasurementRepository, type MeasurementRepository, type NewMeasurement } from '@/entities/measurement';
import { createLocalMedicationRepository, type MedicationRepository, type NewMedication } from '@/entities/medication';
import { createLocalMemberRepository, type NewMember } from '@/entities/member';
import { createLocalVaccineDoseRepository, type NewVaccineDose } from '@/entities/vaccine';
import { FamilyHomeScreen } from './FamilyHomeScreen';

// ---- mocks de plataforma ----------------------------------------------------------------------------------------

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn(), dismissTo: jest.fn() };
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
  return {
    Stack: { Screen: () => null, Toolbar },
    useRouter: () => mockRouter,
    useLocalSearchParams: () => mockParams,
    useIsFocused: () => true,
  };
});
// O segmento do iOS é o Picker do SwiftUI (sem árvore tocável no Jest): usa a variante em React Native.
jest.mock('@/shared/ui/components/SegmentedControl.ios', () => jest.requireActual('@/shared/ui/components/SegmentedControl.tsx'));

let mockFontScale = 1;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: mockFontScale }),
}));

// ---- apoio ------------------------------------------------------------------------------------------------------

const FAMILY = { id: 'f1', name: 'Souza', createdAt: '2026-01-01T00:00:00Z' };
const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const VETOED = ['normal', 'anormal', 'alterado', 'grave', 'crítico', 'risco', 'perigo', 'alerta', 'urgente', 'preocupante', 'saudável', 'doente', 'bom', 'ruim'];

/** Botões SwiftUI (FAB) só respondem à ação de acessibilidade `activate` (docs/DESIGN_SYSTEM.md §5). */
const activate = (el: Parameters<typeof fireEvent>[0]) => fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

const lab = (over: Partial<NewMeasurement>): Omit<NewMeasurement, 'memberId'> => ({
  familyId: 'f1', kind: 'lab', code: 'hba1c', label: 'Hemoglobina glicada', value: 5, value2: null, unit: '%',
  referenceLow: 4, referenceHigh: 5.6, referenceText: null, takenOn: '2026-10-28', takenAt: null, context: null, note: null,
  sourceRecordId: null, origin: 'manual', ...over,
});
const vital = (over: Partial<NewMeasurement>) => lab({ kind: 'vital', referenceLow: null, referenceHigh: null, ...over });
const med = (over: Partial<NewMedication>): Omit<NewMedication, 'memberId'> => ({
  familyId: 'f1', name: 'Losartana', dosage: '50 mg', instructions: '1 comprimido pela manhã', startOn: '2026-01-01', endOn: null,
  sourceRecordId: null, origin: 'manual', ...over,
});
const dose = (vaccineCode: string, appliedOn: string | null): Omit<NewVaccineDose, 'memberId'> => ({
  familyId: 'f1', vaccineCode, vaccineName: null, doseKey: 'D1', doseLabel: '1ª dose', appliedOn, lot: null, location: null,
  sourceRecordId: null, origin: 'manual',
});

async function setup(
  person: Partial<NewMember> = {},
  over: { medications?: Partial<MedicationRepository>; measurements?: Partial<MeasurementRepository> } = {},
) {
  const db = createMemoryDb();
  const members = createLocalMemberRepository(db);
  const records = createLocalHealthRecordRepository(db);
  const measurements = { ...createLocalMeasurementRepository(db), ...over.measurements };
  const vaccineDoses = createLocalVaccineDoseRepository(db);
  const medications = { ...createLocalMedicationRepository(db), ...over.medications };
  const member = await members.create({ familyId: 'f1', fullName: 'Carlos Souza', birthDate: '1959-03-01', relationship: 'spouse', sex: 'male', ...person });
  const { wrapper: Deps } = renderWithDependencies({
    [DEPENDENCY_KEYS.families]: { getMyFamily: async () => FAMILY },
    [DEPENDENCY_KEYS.members]: members,
    [DEPENDENCY_KEYS.records]: records,
    [DEPENDENCY_KEYS.measurements]: measurements,
    [DEPENDENCY_KEYS.vaccineDoses]: vaccineDoses,
    [DEPENDENCY_KEYS.medications]: medications,
    [DEPENDENCY_KEYS.emergencyCards]: { getByMember: async () => null, upsert: async () => null, removeByMember: async () => undefined },
    [DEPENDENCY_KEYS.consents]: {
      listMine: async () => [
        { purpose: 'terms_and_privacy', version: '2026-11-v3', acceptedAt: '2026-11-01T00:00:00.000Z', revokedAt: null },
        { purpose: 'health_data_processing', version: '2026-11-v3', acceptedAt: '2026-11-01T00:00:00.000Z', revokedAt: null },
      ],
    },
  });
  const seed = {
    record: (r: Partial<NewHealthRecord>) =>
      records.create({ familyId: 'f1', memberId: member.id, type: 'result', title: 'Hemograma completo', date: '2026-03-10', location: null, professional: null, notes: null, ...r }),
    measurements: (items: Omit<NewMeasurement, 'memberId'>[]) => measurements.createMany(items.map((i) => ({ ...i, memberId: member.id }))),
    medications: (items: Omit<NewMedication, 'memberId'>[]) => createLocalMedicationRepository(db).createMany(items.map((i) => ({ ...i, memberId: member.id }))),
    doses: (items: Omit<NewVaccineDose, 'memberId'>[]) => vaccineDoses.createMany(items.map((i) => ({ ...i, memberId: member.id }))),
  };
  const renderScreen = async (params: Record<string, string> = {}) => {
    // A pessoa abre como divisória do painel da família (`?member=`); `id` nos testes antigos = a pessoa pedida.
    const { id, ...rest } = params;
    mockParams = { member: id ?? member.id, ...rest };
    const wrapper = ({ children }: { children?: ReactNode }) => (
      <SafeAreaProvider initialMetrics={METRICS}>
        <ThemeProvider scheme="light" reducedMotion>
          <Deps>{children}</Deps>
        </ThemeProvider>
      </SafeAreaProvider>
    );
    return render(<FamilyHomeScreen />, { wrapper });
  };
  return { member, seed, renderScreen, medications };
}

/** Todos os textos visíveis da tela, para conferir copy (métrica "Calma" da spec). */
const allTexts = () => screen.getAllByText(/.+/).map((n) => String((n.props as { children?: unknown }).children ?? ''));

beforeEach(() => {
  // Hoje = 11/11/2026. Timers falsos que andam com o relógio: o waitFor os avança dentro do act (sem aviso da FlatList).
  jest.useFakeTimers({
    now: new Date(2026, 10, 11, 12, 0, 0),
    advanceTimers: true,
    doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'queueMicrotask'],
  });
  mockRouter.push.mockClear();
  mockFontScale = 1;
});
afterEach(() => jest.useRealTimers());

// ---- F6: Resumo -------------------------------------------------------------------------------------------------

describe('Pessoa · Resumo (F6)', () => {
  it('abre no Resumo com nome, "parentesco · idade · n documentos" e as seções na ordem da spec (F6.1, F6.2)', async () => {
    const { seed, renderScreen } = await setup();
    await seed.record({});
    await renderScreen();

    expect(await screen.findByText('Cônjuge · 67 anos · 1 documento')).toBeOnTheScreen();
    expect(screen.getByText('Carlos Souza')).toBeOnTheScreen();
    // O título da pessoa fica no cabeçalho da folha, no mesmo lugar de "Família Souza" (casca única), sem avatar.
    expect(within(screen.getByTestId('member-header')).getByText('Carlos Souza')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Resumo' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Documentos' })).not.toBeSelected();
    // A linha do tempo não aparece no Resumo.
    expect(screen.queryByText('Hemograma completo')).toBeNull();

    await waitFor(() => expect(screen.queryAllByLabelText('Carregando')).toHaveLength(0));
    const headings = screen.getAllByRole('header').map((h) => String((h.props as { children?: unknown }).children));
    expect(headings).toEqual(['Carlos Souza', 'Vacinas', 'Exames recentes', 'Medicamentos em uso', 'Sinais vitais']);
    for (const id of ['summary-vaccines', 'summary-labs', 'summary-medications', 'summary-vitals']) {
      expect(within(screen.getByTestId(id)).getByRole('button', { name: 'Ver tudo' })).toBeOnTheScreen();
    }
  });

  it('a ficha fica no topo do resumo e o toque abre a leitura quando o termo v3 está aceito', async () => {
    const { member, renderScreen } = await setup();
    await renderScreen();
    const row = await screen.findByTestId('summary-emergency');
    expect(within(row).getByText('Ficha de emergência')).toBeOnTheScreen();
    expect(await within(row).findByText('Ainda não preenchida')).toBeOnTheScreen();
    await fireEvent.press(row);
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(main)/member/[id]/emergency', params: { id: member.id } });
  });

  it('sem nenhum dado: frase do "tudo vazio" e, em cada seção, a frase curta com a ação (F6.3)', async () => {
    const { member, renderScreen } = await setup({ fullName: 'Ana Souza', birthDate: '1988-05-20', relationship: 'self' });
    await renderScreen();

    expect(await screen.findByText('Ainda não há dados de saúde de Ana. Guarde um documento para começar.')).toBeOnTheScreen();
    expect(screen.getByText('Nenhum exame registrado.')).toBeOnTheScreen();
    expect(screen.getByText('Nenhum medicamento registrado.')).toBeOnTheScreen();
    expect(screen.getByText('Nenhuma medição registrada.')).toBeOnTheScreen();

    const actions: [string, unknown][] = [
      ['Adicionar resultado', { pathname: '/(main)/measurement/new', params: { memberId: member.id } }],
      ['Registrar dose', { pathname: '/(main)/vaccine-dose/new', params: { memberId: member.id } }],
      ['Adicionar medicamento', { pathname: '/(main)/medication/new', params: { memberId: member.id } }],
      ['Registrar sinal vital', { pathname: '/(main)/vital/new', params: { memberId: member.id } }],
    ];
    for (const [name, route] of actions) {
      await fireEvent.press(screen.getByRole('button', { name }));
      expect(mockRouter.push).toHaveBeenLastCalledWith(route);
    }
  });

  it('Vacinas: "{n} pendências" com a primeira pendência e o status em texto; A3 e A13 no rodapé (F6.2, R14, S7)', async () => {
    // Lia, 10 meses (exemplo da F3.3): penta D3 e febre amarela atrasadas pelo calendário.
    const { renderScreen } = await setup({ fullName: 'Lia Souza', birthDate: '2026-01-10', relationship: 'child' });
    await renderScreen();

    const vaccines = await screen.findByTestId('summary-vaccines-status');
    expect(within(vaccines).getByText(/^\d+ pendências$/)).toBeOnTheScreen();
    expect(within(vaccines).getByText(/, atrasada pelo calendário$/)).toBeOnTheScreen();
    const section = screen.getByTestId('summary-vaccines');
    expect(
      within(section).getByText(
        'Referência do calendário público. Confirme com o profissional de saúde. As pendências consideram só as doses registradas no app.',
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(vaccines);
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/(main)/member/[id]/vaccines', params: { id: expect.any(String) } });
  });

  it('Vacinas: "Em dia com o calendário" quando não há Pendente, Atrasada nem Confirmar na carteira (R14)', async () => {
    const { seed, renderScreen } = await setup({ fullName: 'Ana Souza', birthDate: '1996-01-01', relationship: 'self' });
    await seed.doses([
      dose('hepatitis_b', null), dose('hepatitis_b', null), dose('hepatitis_b', null),
      dose('dt', null), dose('dt', null), dose('dt', '2020-01-01'),
      dose('mmr', null), dose('yellow_fever', '2015-03-01'),
    ]);
    await renderScreen();

    expect(await within(await screen.findByTestId('summary-vaccines-status')).findByText('Em dia com o calendário')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Registrar dose' })).toBeNull();
  });

  it('sem data de nascimento: A12 e "Adicionar data de nascimento", sem pendência (F3.4, R13)', async () => {
    const { member, renderScreen } = await setup({ fullName: 'Dirce Souza', birthDate: null, relationship: 'parent' });
    await renderScreen();

    expect(await screen.findByText('Adicione a data de nascimento de Dirce para ver as vacinas do calendário.')).toBeOnTheScreen();
    expect(screen.queryByText(/pendência/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar data de nascimento' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/(main)/member/[id]/edit', params: { id: member.id } });
  });

  it('Exames recentes: até 5 séries dos últimos 12 meses, fora da faixa primeiro, com estado, faixa, data e A1, sem a origem (F6.2)', async () => {
    const { member, seed, renderScreen } = await setup();
    const record = await seed.record({ title: 'Laudo Laboratório Vida', date: '2026-10-28' });
    await seed.measurements([
      lab({ code: 'creatinine', label: 'Creatinina', value: 1, unit: 'mg/dL', referenceLow: 0.7, referenceHigh: 1.3, takenOn: '2026-11-05' }),
      lab({ code: 'glucose', label: 'Glicose', value: 99, unit: 'mg/dL', referenceLow: 70, referenceHigh: 99, takenOn: '2026-11-04' }),
      lab({ code: 'hba1c', value: 7.4, takenOn: '2026-10-28', sourceRecordId: record.id, origin: 'ocr' }),
      lab({ code: 'ldl', label: 'Colesterol LDL', value: 120, unit: 'mg/dL', referenceLow: null, referenceHigh: null, referenceText: 'Desejável: < 100', takenOn: '2026-10-20' }),
      lab({ code: 'tsh', label: 'TSH', value: 2.1, unit: 'µUI/mL', referenceLow: 0.4, referenceHigh: 4, takenOn: '2026-09-01' }),
      lab({ code: 'hdl', label: 'Colesterol HDL', value: 38, unit: 'mg/dL', referenceLow: 40, referenceHigh: null, takenOn: '2026-08-01' }),
      lab({ code: 'ferritin', label: 'Ferritina', value: 80, unit: 'ng/mL', referenceLow: 30, referenceHigh: 400, takenOn: '2025-11-10' }),
    ]);
    await renderScreen();

    const section = await screen.findByTestId('summary-labs');
    await within(section).findByText('Hemoglobina glicada');
    const rows = within(section).getAllByTestId(/^summary-lab-/).map((r) => r.props.testID);
    // HDL (abaixo) e HbA1c (acima) primeiro, por data; depois os mais recentes. Ferritina (12 meses e 1 dia) fica de fora.
    expect(rows).toEqual(['summary-lab-hba1c', 'summary-lab-hdl', 'summary-lab-creatinine', 'summary-lab-glucose', 'summary-lab-ldl']);

    const hba1c = screen.getByTestId('summary-lab-hba1c');
    expect(within(hba1c).getByText('Acima da faixa')).toBeOnTheScreen();
    expect(within(hba1c).getByText('Faixa do laudo: 4–5,6 % · 28 de out. de 2026')).toBeOnTheScreen();
    // A origem (S5) fica na série e no detalhe; o Resumo fica limpo (C3).
    expect(within(section).queryByText(/^Do documento|^Registrado por você/)).toBeNull();
    expect(hba1c).toHaveAccessibleName('Hemoglobina glicada, 7,4 por cento, acima da faixa do laudo. Faixa do laudo: 4–5,6 % · 28 de out. de 2026');
    expect(within(screen.getByTestId('summary-lab-glucose')).getByText('Dentro da faixa')).toBeOnTheScreen();
    expect(within(screen.getByTestId('summary-lab-hdl')).getByText('Abaixo da faixa')).toBeOnTheScreen();
    expect(within(screen.getByTestId('summary-lab-hdl')).getByText('Faixa do laudo: a partir de 40 mg/dL · 1 de ago. de 2026')).toBeOnTheScreen();
    const ldl = screen.getByTestId('summary-lab-ldl');
    expect(within(ldl).getByText('Sem faixa')).toBeOnTheScreen();
    expect(within(ldl).getByText('Faixa do laudo: “Desejável: < 100” (texto do laudo) · 20 de out. de 2026')).toBeOnTheScreen();
    // Casas do analito (creatinina 1 → "1,0") e unidade falada no singular.
    const creatinine = screen.getByTestId('summary-lab-creatinine');
    expect(within(creatinine).getByText('1,0')).toBeOnTheScreen();
    expect(creatinine).toHaveAccessibleName(/^Creatinina, 1,0 miligrama por decilitro, dentro da faixa do laudo/);
    expect(
      within(section).getByText('A faixa de referência é a impressa no laudo. Só o profissional de saúde pode interpretar o resultado.'),
    ).toBeOnTheScreen();

    await fireEvent.press(hba1c);
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/(main)/member/[id]/exams/[series]', params: { id: member.id, series: 'hba1c' } });
    await fireEvent.press(within(section).getByRole('button', { name: 'Ver tudo' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/(main)/member/[id]/exams', params: { id: member.id } });
  });

  it('exames só de mais de 12 meses: "Nenhum resultado nos últimos 12 meses." com "Adicionar resultado"', async () => {
    const { seed, renderScreen } = await setup();
    await seed.measurements([lab({ takenOn: '2025-01-15' })]);
    await renderScreen();

    expect(await screen.findByText('Nenhum resultado nos últimos 12 meses.')).toBeOnTheScreen();
    expect(within(screen.getByTestId('summary-labs')).getByRole('button', { name: 'Adicionar resultado' })).toBeOnTheScreen();
    expect(screen.queryByText(/Ainda não há dados de saúde/)).toBeNull();
  });

  it('Medicamentos em uso: só os ativos (R5), com dosagem, instrução, plano e A5, sem a origem', async () => {
    const { member, seed, renderScreen } = await setup();
    await seed.medications([
      med({}),
      med({ name: 'Amoxicilina', dosage: '500 mg', instructions: 'De 8 em 8 horas', startOn: '2026-11-05', endOn: '2026-11-11' }),
      med({ name: 'Dipirona', dosage: null, instructions: null, startOn: '2026-10-01', endOn: '2026-11-10' }),
      med({ name: 'Vitamina D', startOn: '2026-11-12' }),
    ]);
    await renderScreen();

    const section = await screen.findByTestId('summary-medications');
    expect(await within(section).findByText('Losartana 50 mg')).toBeOnTheScreen();
    expect(within(section).getByText('1 comprimido pela manhã · uso contínuo')).toBeOnTheScreen();
    expect(within(section).getByText('Amoxicilina 500 mg')).toBeOnTheScreen();
    expect(within(section).getByText('De 8 em 8 horas · até 11 de nov. de 2026')).toBeOnTheScreen();
    expect(within(section).queryByText(/^Do documento|^Registrado por você/)).toBeNull();
    expect(within(section).queryByText(/Dipirona|Vitamina D/)).toBeNull();
    expect(within(section).getByText('Lista para consulta. Não mude o tratamento sem falar com o profissional de saúde.')).toBeOnTheScreen();

    await fireEvent.press(within(section).getByRole('button', { name: 'Ver tudo' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/(main)/member/[id]/medications', params: { id: member.id } });
  });

  it('Sinais vitais: último de cada tipo com data e hora, sem faixa nem estado (S3), sparkline com resumo e A4', async () => {
    const { member, seed, renderScreen } = await setup();
    await seed.measurements([
      vital({ code: 'bp', label: 'Pressão arterial', value: 136, value2: 84, unit: 'mmHg', takenOn: '2026-11-01', takenAt: '08:00' }),
      vital({ code: 'bp', label: 'Pressão arterial', value: 142, value2: 88, unit: 'mmHg', takenOn: '2026-11-10', takenAt: '08:12' }),
      vital({ code: 'glucose_capillary', label: 'Glicemia capilar', value: 128, unit: 'mg/dL', context: 'fasting', takenOn: '2026-11-10', takenAt: '07:40' }),
      vital({ code: 'weight', label: 'Peso', value: 82.4, unit: 'kg', takenOn: '2026-11-02' }),
    ]);
    await renderScreen();

    const section = await screen.findByTestId('summary-vitals');
    const bp = await within(section).findByTestId('summary-vital-bp');
    expect(bp).toHaveAccessibleName('Pressão arterial, 142 por 88 milímetros de mercúrio. 10 de nov. de 2026, 08:12');
    expect(within(bp).getByText('142/88')).toBeOnTheScreen();
    expect(within(section).getByTestId('summary-bp-sparkline')).toHaveAccessibleName('2 medições, de 1 de nov. de 2026 a 10 de nov. de 2026. Última: 142/88');
    expect(within(section).getByText('Glicemia capilar · em jejum')).toBeOnTheScreen();
    expect(within(section).getByText('10 de nov. de 2026, 07:40')).toBeOnTheScreen();
    expect(within(section).getByText('82,4')).toBeOnTheScreen();
    expect(within(section).queryByTestId('summary-vital-height')).toBeNull();
    expect(within(section).queryByText(/faixa/i)).toBeNull();
    expect(within(section).getByText('O app não avalia estes valores. Mostre a sequência ao profissional que acompanha Carlos.')).toBeOnTheScreen();

    await fireEvent.press(within(section).getByTestId('summary-vital-glucose_capillary'));
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/(main)/member/[id]/vitals/[code]', params: { id: member.id, code: 'glucose_capillary' } });
    await fireEvent.press(within(section).getByRole('button', { name: 'Ver tudo' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/(main)/member/[id]/vitals/[code]', params: { id: member.id, code: 'bp' } });
  });

  it('uma seção com erro mostra "Tentar de novo" sem derrubar as outras (F6, estados)', async () => {
    const listByMember = jest.fn().mockRejectedValueOnce(new Error('fora do ar')).mockResolvedValue([]);
    const { seed, renderScreen } = await setup({}, { medications: { listByMember } });
    await seed.measurements([lab({ value: 7.4 })]);
    await renderScreen();

    const section = await screen.findByTestId('summary-medications');
    expect(await within(section).findByText('Não foi possível carregar os medicamentos.')).toBeOnTheScreen();
    expect(within(screen.getByTestId('summary-labs')).getByText('Hemoglobina glicada')).toBeOnTheScreen();

    await fireEvent.press(within(section).getByRole('button', { name: 'Tentar de novo' }));
    expect(await within(section).findByText('Nenhum medicamento registrado.')).toBeOnTheScreen();
    expect(listByMember).toHaveBeenCalledTimes(2);
  });

  it('carregando: esqueleto por seção, com "Carregando" para o leitor de tela', async () => {
    const { renderScreen } = await setup({}, { measurements: { listByMember: () => new Promise(() => {}) } });
    await renderScreen();

    await screen.findByText('Carlos Souza');
    expect(within(screen.getByTestId('summary-labs')).getByLabelText('Carregando')).toBeOnTheScreen();
    expect(within(screen.getByTestId('summary-vitals')).getByLabelText('Carregando')).toBeOnTheScreen();
    expect(await within(screen.getByTestId('summary-medications')).findByText('Nenhum medicamento registrado.')).toBeOnTheScreen();
  });

  it('nenhuma palavra vetada nem exclamação no Resumo (§3.2, métrica "Calma")', async () => {
    const { seed, renderScreen } = await setup({ fullName: 'Lia Souza', birthDate: '2026-01-10', relationship: 'child' });
    await seed.measurements([
      lab({ value: 7.4 }),
      lab({ code: 'hdl', label: 'Colesterol HDL', value: 38, unit: 'mg/dL', referenceLow: 40, referenceHigh: null }),
      vital({ code: 'weight', label: 'Peso', value: 8.2, unit: 'kg' }),
    ]);
    await seed.medications([med({})]);
    await renderScreen();
    await screen.findByText('Hemoglobina glicada');

    const text = allTexts().join('\n');
    expect(text).not.toMatch(/!/);
    for (const word of VETOED) expect(text.toLocaleLowerCase('pt-BR')).not.toMatch(new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, 'u'));
  });

  it('em AX5 o cabeçalho segue na folha e nenhum texto é truncado (F6.4)', async () => {
    mockFontScale = 3.1;
    const { seed, renderScreen } = await setup();
    await seed.measurements([lab({ value: 7.4 })]);
    await renderScreen();

    await screen.findByText('Hemoglobina glicada');
    expect(screen.getByTestId('member-header')).toBeOnTheScreen();
    // O segmento do Android (shared/ui) limita o rótulo a 2 linhas por desenho; o iOS usa o controle do sistema.
    expect(within(screen.getByTestId('member-health-summary')).getAllByText(/.+/).filter((n) => (n.props as { numberOfLines?: number }).numberOfLines)).toHaveLength(0);
  });
});

// ---- Documentos (linha do tempo do MVP, sem regressão) -----------------------------------------------------------

describe('Pessoa · Documentos (F6.1, sem regressão do MVP)', () => {
  it('troca para Documentos: meses, registros, os 7 tipos como filtro e o estado vazio do filtro', async () => {
    const { seed, renderScreen } = await setup();
    await seed.record({ title: 'Hemograma completo', date: '2026-03-10' });
    await seed.record({ type: 'consultation', title: 'Consulta cardiologista', date: '2026-02-02' });
    await renderScreen();

    await fireEvent.press(await screen.findByRole('radio', { name: 'Documentos' }));
    expect(await screen.findByText('Hemograma completo')).toBeOnTheScreen();
    expect(screen.queryByTestId('member-health-summary')).toBeNull();
    expect(screen.getByText('março de 2026')).toBeOnTheScreen();
    for (const name of ['Todos', 'Consulta', 'Exame', 'Resultado', 'Laudo', 'Receita', 'Vacina', 'Outro']) {
      expect(screen.getByRole('button', { name })).toBeOnTheScreen();
    }

    await fireEvent.press(screen.getByRole('button', { name: 'Consulta' }));
    await waitFor(() => expect(screen.queryByText('Hemograma completo')).toBeNull());
    expect(screen.getByText('Consulta cardiologista')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Consulta' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Vacina' }));
    expect(await screen.findByText('Nenhum documento deste tipo')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Limpar filtro' }));
    expect(await screen.findByText('Hemograma completo')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: /Hemograma completo/ }));
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/(main)/record/[id]', params: { id: expect.any(String) } });
  });

  it('?view=documents abre direto nos documentos; sem registros mostra o estado vazio do MVP', async () => {
    const { renderScreen } = await setup({ fullName: 'Ana Souza' });
    await renderScreen({ view: 'documents' });

    expect(await screen.findByText(/Ainda não há documentos de Ana Souza/)).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Documentos' })).toBeSelected();
  });

  it('pessoa removida: "Pessoa não encontrada" com "Voltar para a família", que abre a divisória da família', async () => {
    const { renderScreen } = await setup();
    await renderScreen({ id: 'nao-existe' });

    expect(await screen.findByText('Pessoa não encontrada')).toBeOnTheScreen();
    expect(screen.queryByRole('radio', { name: 'Resumo' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar para a família' }));
    expect(await screen.findByText('Família Souza')).toBeOnTheScreen();
  });
});

// ---- ações da tela ----------------------------------------------------------------------------------------------

describe('Pessoa · ações', () => {
  it('o FAB "Novo registro" leva a pessoa preselecionada, nos dois segmentos (F6.5)', async () => {
    const { member, renderScreen } = await setup();
    await renderScreen();
    const route = { pathname: '/(main)/record/new', params: { memberId: member.id } };

    await activate(await screen.findByRole('button', { name: 'Novo registro' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith(route);
    mockRouter.push.mockClear();
    await fireEvent.press(screen.getByRole('radio', { name: 'Documentos' }));
    await activate(screen.getByRole('button', { name: 'Novo registro' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith(route);
  });

  it('régua de abas: a aba da pessoa vem marcada e "Família" troca a divisória na mesma tela, sem navegar', async () => {
    const { renderScreen } = await setup();
    await renderScreen();
    const own = await screen.findByRole(RAIL_TAB_ROLE, { name: 'Carlos Souza, 0 documentos' });
    expect(own).toBeSelected();
    expect(screen.getByRole(RAIL_TAB_ROLE, { name: 'Família' })).not.toBeSelected();

    await fireEvent.press(own);
    await fireEvent.press(screen.getByRole(RAIL_TAB_ROLE, { name: 'Família' }));
    expect(await screen.findByText('Família Souza')).toBeOnTheScreen();
    expect(screen.getByRole(RAIL_TAB_ROLE, { name: 'Família' })).toBeSelected();
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  it('"Editar pessoa" fica ao lado do nome, caminho garantido para a edição (BUG-01)', async () => {
    const { member, renderScreen } = await setup();
    await renderScreen();
    await fireEvent.press(await screen.findByRole('button', { name: 'Editar pessoa' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/(main)/member/[id]/edit', params: { id: member.id } });
  });
});
