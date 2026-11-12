// Detalhe do registro: itens ligados e exclusão com a A15 (contagem de useRecordLinkedItems). Hoje = 11/11/2026.
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createLocalAttachmentStorage, createLocalHealthRecordRepository } from '@/entities/health-record';
import { createLocalMeasurementRepository, type MeasurementRepository } from '@/entities/measurement';
import { createLocalMedicationRepository } from '@/entities/medication';
import { createLocalMemberRepository } from '@/entities/member';
import { createLocalVaccineDoseRepository } from '@/entities/vaccine';
import { DEPENDENCY_KEYS, LOCAL_COLLECTIONS, LOCAL_SESSION_ID } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { ThemeProvider, categoricalIndexFor, lightTheme } from '@/shared/ui';
import { RecordDetailScreen } from './RecordDetailScreen';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => {
  /* eslint-disable @typescript-eslint/no-require-imports -- fábrica de jest.mock não pode usar imports de topo */
  const React = require('react');
  const { Pressable } = require('react-native');
  /* eslint-enable @typescript-eslint/no-require-imports */
  // Menu "…": começa fechado e abre ao tocar; cada ação vira um botão (como o UIMenu).
  const Menu = ({ accessibilityLabel, children }: { accessibilityLabel: string; children?: unknown }) => {
    const [open, setOpen] = React.useState(false);
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(Pressable, { accessibilityRole: 'button', accessibilityLabel, onPress: () => setOpen((o: boolean) => !o) }),
      open ? children : null,
    );
  };
  const MenuAction = ({ children, onPress }: { children: string; onPress: () => void }) =>
    React.createElement(Pressable, { accessibilityRole: 'button', accessibilityLabel: children, onPress });
  const Toolbar = Object.assign(({ children }: { children?: unknown }) => React.createElement(React.Fragment, null, children), { Menu, MenuAction });
  return { Stack: { Screen: () => null, Toolbar }, useRouter: () => mockRouter, useLocalSearchParams: () => mockParams, useFocusEffect: () => undefined };
});
jest.mock('@/shared/ui/components/BottomSheet.ios', () => jest.requireActual('@/shared/ui/components/BottomSheet.tsx'));
jest.mock('react-native-webview', () => ({ WebView: () => null }));

const activate = (el: Parameters<typeof fireEvent>[0]) => fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
const A1 = 'A faixa de referência é a impressa no laudo. Só o profissional de saúde pode interpretar o resultado.';

async function setup(opts: { items?: 'three' | 'one' | 'none'; failMeasurements?: boolean } = {}) {
  const db = createMemoryDb();
  await db.put(LOCAL_COLLECTIONS.session, LOCAL_SESSION_ID, { userId: 'u1' });
  const ana = await createLocalMemberRepository(db).create({ familyId: 'f1', fullName: 'Ana Souza', birthDate: '1990-05-01', relationship: 'self', sex: 'female' });
  const records = createLocalHealthRecordRepository(db);
  const measurements = createLocalMeasurementRepository(db);
  const vaccineDoses = createLocalVaccineDoseRepository(db);
  const medications = createLocalMedicationRepository(db);
  const record = await records.create({
    familyId: 'f1',
    memberId: ana.id,
    type: 'result',
    title: 'Hemograma completo',
    date: '2026-11-03',
    location: 'Laboratório Vida',
    professional: null,
    notes: null,
  });
  const link = { familyId: 'f1', memberId: ana.id, sourceRecordId: record.id, origin: 'ocr' as const };
  if (opts.items && opts.items !== 'none') {
    await measurements.createMany([
      {
        ...link,
        kind: 'lab',
        code: 'hemoglobin',
        label: 'Hemoglobina',
        value: 11.2,
        value2: null,
        unit: 'g/dL',
        referenceLow: 12,
        referenceHigh: 15.5,
        referenceText: '12,0 a 15,5 g/dL',
        takenOn: '2026-11-03',
        takenAt: null,
        context: null,
        note: null,
      },
    ]);
  }
  if (opts.items === 'three') {
    await vaccineDoses.createMany([
      { ...link, vaccineCode: 'influenza', vaccineName: null, doseKey: 'DU', doseLabel: 'Dose única', appliedOn: '2026-04-15', lot: 'FLU26A0412', location: null },
    ]);
    await medications.createMany([
      { ...link, name: 'Losartana', dosage: '50 mg', instructions: '1 comprimido pela manhã', startOn: '2026-11-10', endOn: null },
    ]);
  }
  const failing: MeasurementRepository = { ...measurements, listBySourceRecord: () => Promise.reject(new Error('offline')) };
  const { wrapper: Wrapper } = renderWithDependencies({
    [DEPENDENCY_KEYS.members]: createLocalMemberRepository(db),
    [DEPENDENCY_KEYS.records]: records,
    [DEPENDENCY_KEYS.storage]: createLocalAttachmentStorage(),
    [DEPENDENCY_KEYS.measurements]: opts.failMeasurements ? failing : measurements,
    [DEPENDENCY_KEYS.vaccineDoses]: vaccineDoses,
    [DEPENDENCY_KEYS.medications]: medications,
  });
  mockParams = { id: record.id };
  await render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
      <ThemeProvider scheme="light" reducedMotion>
        <Wrapper>
          <RecordDetailScreen />
        </Wrapper>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  await screen.findByText('Hemograma completo');
  return { ana, record, records, measurements, vaccineDoses, medications };
}

async function openDelete() {
  await fireEvent.press(await screen.findByRole('button', { name: 'Mais ações' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Excluir registro' }));
  expect(await screen.findByText('Excluir este registro?')).toBeOnTheScreen();
}

beforeEach(() => {
  jest.useFakeTimers({
    now: new Date(2026, 10, 11, 12, 0),
    doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'hrtime', 'requestIdleCallback', 'cancelIdleCallback'],
  });
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

describe('detalhe do registro', () => {
  it('lista os itens ligados, cada um abrindo a sua tela, com a A1', async () => {
    const { ana } = await setup({ items: 'three' });
    expect(await screen.findByText('Itens deste documento')).toBeOnTheScreen();
    expect(screen.getByText(A1)).toBeOnTheScreen();
    expect(screen.getByText('Ana Souza · 3 de novembro de 2026')).toBeOnTheScreen();

    const exam = screen.getByRole('button', { name: /^Hemoglobina, 11,2 gramas por decilitro, abaixo da faixa do laudo, Faixa do laudo: 12,0 a 15,5 g\/dL/ });
    await fireEvent.press(exam);
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(main)/member/[id]/exams/[series]', params: { id: ana.id, series: 'hemoglobin' } });

    await fireEvent.press(screen.getByRole('button', { name: /^Influenza, Dose única · 15 de abr\. de 2026 · Lote FLU26A0412/ }));
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/(main)/member/[id]/vaccines', params: { id: ana.id } });

    await fireEvent.press(screen.getByRole('button', { name: /^Losartana 50 mg, 1 comprimido pela manhã · Uso contínuo/ }));
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/(main)/member/[id]/medications', params: { id: ana.id } });
  });

  it('v4: o registro fica numa folha sobre a divisória da pessoa dona dele', async () => {
    const { ana } = await setup();
    const paints = (color: string) => StyleSheet.flatten(screen.getByTestId('screen-board', { includeHiddenElements: true }).props.style).backgroundColor === color;
    expect(paints(lightTheme.personBoard(categoricalIndexFor(ana.id)).board)).toBe(true);
    expect(screen.queryAllByTestId('leaf-hole', { includeHiddenElements: true })).toHaveLength(0);
  });

  it('excluir com itens ligados mostra a A15 com o {n} certo e apaga tudo', async () => {
    const { record, records, measurements, vaccineDoses, medications } = await setup({ items: 'three' });
    await screen.findByText('Itens deste documento');
    await openDelete();
    expect(screen.getByText('Este documento tem 3 itens de saúde ligados a ele. Eles também serão apagados.')).toBeOnTheScreen();
    await activate(screen.getAllByRole('button', { name: 'Excluir registro' }).at(-1)!);

    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    await expect(records.getById(record.id)).resolves.toBeNull();
    await expect(measurements.listBySourceRecord(record.id)).resolves.toEqual([]);
    await expect(vaccineDoses.listBySourceRecord(record.id)).resolves.toEqual([]);
    await expect(medications.listBySourceRecord(record.id)).resolves.toEqual([]);
  });

  it('A15 no singular com um item só', async () => {
    await setup({ items: 'one' });
    await screen.findByText('Itens deste documento');
    await openDelete();
    expect(screen.getByText('Este documento tem 1 item de saúde ligado a ele. Ele também será apagado.')).toBeOnTheScreen();
  });

  it('sem itens ligados: a seção some e a confirmação é a do MVP', async () => {
    await setup({ items: 'none' });
    await waitFor(() => expect(screen.queryByTestId('linked-loading')).toBeNull());
    expect(screen.queryByText('Itens deste documento')).toBeNull();
    expect(screen.queryByText(A1)).toBeNull();
    expect(screen.getByText('Laboratório Vida')).toBeOnTheScreen();
    expect(screen.getByText('Só quem é da família vê estes arquivos.')).toBeOnTheScreen();
    await openDelete();
    expect(screen.getByText('O registro e os arquivos anexados serão apagados. Não dá para desfazer.')).toBeOnTheScreen();
  });

  it('erro ao carregar os itens fica na seção e não derruba o resto', async () => {
    await setup({ items: 'one', failMeasurements: true });
    expect(await screen.findByTestId('linked-error')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
    expect(screen.getByText('Laboratório Vida')).toBeOnTheScreen();
  });

  it('não usa palavras vetadas nem exclamação', async () => {
    await setup({ items: 'three' });
    await screen.findByText('Itens deste documento');
    const texts = screen.getAllByText(/./).map((n) => String(n.props.children));
    expect(texts.join(' ')).not.toMatch(/\b(normal|anormal|alterad[oa]|grave|crítico|risco|perigo|alerta|urgente|preocupante|saudável|doente|bom|ruim)\b|!/i);
  });
});
