// Captura inteligente (spec F1, critérios 4 a 15) com extrator falso. Hoje = 11/11/2026.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createLocalFamilyRepository } from '@/entities/family';
import { createLocalAttachmentStorage, createLocalHealthRecordRepository } from '@/entities/health-record';
import { createLocalMeasurementRepository } from '@/entities/measurement';
import { createLocalMedicationRepository } from '@/entities/medication';
import { createLocalMemberRepository } from '@/entities/member';
import { createLocalVaccineDoseRepository } from '@/entities/vaccine';
import type { DocumentTextExtractor } from '@/features/read-document';
import { DEPENDENCY_KEYS, DomainError, LOCAL_COLLECTIONS, LOCAL_SESSION_ID, clearLocalFiles, createLocalDb } from '@/shared/lib';
import { renderWithDependencies } from '@/shared/lib/testing';
import { ThemeProvider } from '@/shared/ui';
import { NewRecordScreen } from './NewRecordScreen';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));
const mockLibrary = jest.fn();
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: null })),
  launchImageLibraryAsync: (...args: unknown[]) => mockLibrary(...args),
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: null })) }));
// Folhas nativas do SwiftUI não têm árvore RN tocável: nos testes valem as variantes em React Native.
jest.mock('@/shared/ui/components/BottomSheet.ios', () => jest.requireActual('@/shared/ui/components/BottomSheet.tsx'));
jest.mock('@/shared/ui/components/ActionSheet.ios', () => jest.requireActual('@/shared/ui/components/ActionSheet.tsx'));

// O jest roda como iOS: o Button é SwiftUI e é acionado pela ação de acessibilidade "activate".
const activate = (el: Parameters<typeof fireEvent>[0]) => fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
// Select no iOS: mede o campo e dispara a ação do menu nativo.
const chooseOption = async (name: RegExp, value: string) => {
  await fireEvent(screen.getByRole('button', { name }), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 48 } } });
  await fireEvent(await screen.findByRole('button', { name }), 'pressAction', { nativeEvent: { event: value } });
};

const LAUDO = `LABORATÓRIO VIDA
Paciente: Marina Duarte Costa
Médico solicitante: Dra. Paula Lima
Data da coleta: 03/11/2026
HEMOGRAMA
Hemoglobina ................... 11,2 g/dL          12,0 a 15,5 g/dL
Plaquetas ..................... 245.000 /mm³       150.000 a 450.000 /mm³
Glicose ........ 104`;
const RECEITA = `Clínica Viver Bem
Paciente: Ana Souza
Data: 10/11/2026
RECEITUÁRIO
1. Amoxicilina 500 mg
Tomar 1 cápsula de 8 em 8 horas por 7 dias.
2. Losartana 50 mg
Tomar 1 comprimido pela manhã.`;
const VACINA = `Centro de Vacinação Imunizar
Paciente: Ana Souza
Influenza dose única 15/04/2026 Lote FLU26A0412`;
const SO_REGISTRO = `LABORATÓRIO VIDA
Paciente: Ana Souza
Data da coleta: 03/11/2026
Ultrassonografia de abdome sem achados descritos.`;
const BANNED = /\b(normal|anormal|alterad[oa]|grave|crítico|risco|perigo|alerta|urgente|preocupante|saudável|doente|bom|ruim)\b|!/i;

const A6 = 'Confira cada item com o documento. Só o que você marcar será salvo.';
const A8 = 'Texto simulado (modo demonstração)';
const A9 = 'A leitura automática não está disponível nesta versão do app. Preencha os dados abaixo.';
const A10 = 'Não conseguimos ler o texto deste documento. Preencha os dados abaixo. O arquivo foi anexado.';

type Extract = DocumentTextExtractor['extract'];
const extractorOf = (text: string, availability: DocumentTextExtractor['availability'] = 'device') => ({
  availability,
  extract: jest.fn<ReturnType<Extract>, Parameters<Extract>>(async () => ({
    engine: availability === 'demo' ? ('demo' as const) : ('apple-vision' as const),
    pageCount: 1,
    truncated: false,
    pages: [{ index: 0, text, source: 'ocr' as const }],
  })),
});

async function setup(extractor: DocumentTextExtractor, { preset = true, others = [] as string[] } = {}) {
  const db = createLocalDb();
  await db.put(LOCAL_COLLECTIONS.session, LOCAL_SESSION_ID, { userId: 'u1' });
  const family = await createLocalFamilyRepository(db).createFamily('Souza');
  const ana = await createLocalMemberRepository(db).create({
    familyId: family.id,
    fullName: 'Ana Souza',
    birthDate: '1990-05-01',
    relationship: 'self',
    sex: 'female',
  });
  for (const fullName of others) {
    await createLocalMemberRepository(db).create({ familyId: family.id, fullName, birthDate: '1960-01-01', relationship: 'parent', sex: 'male' });
  }
  const ports = {
    records: createLocalHealthRecordRepository(db),
    measurements: createLocalMeasurementRepository(db),
    vaccineDoses: createLocalVaccineDoseRepository(db),
    medications: createLocalMedicationRepository(db),
  };
  const { wrapper: Wrapper } = renderWithDependencies({
    [DEPENDENCY_KEYS.families]: createLocalFamilyRepository(db),
    [DEPENDENCY_KEYS.members]: createLocalMemberRepository(db),
    [DEPENDENCY_KEYS.records]: ports.records,
    [DEPENDENCY_KEYS.storage]: createLocalAttachmentStorage(),
    [DEPENDENCY_KEYS.measurements]: ports.measurements,
    [DEPENDENCY_KEYS.vaccineDoses]: ports.vaccineDoses,
    [DEPENDENCY_KEYS.medications]: ports.medications,
    [DEPENDENCY_KEYS.documentText]: extractor,
  });
  mockParams = preset ? { memberId: ana.id } : {};
  await render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
      <ThemeProvider scheme="light" reducedMotion>
        <Wrapper>
          <NewRecordScreen />
        </Wrapper>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  await screen.findByTestId('title-input');
  return { family, ana, ...ports };
}

/** Anexa uma foto pela galeria (arquivo real no cache, para o salvar copiar). */
async function attach(fileName = 'laudo.jpg') {
  const picked = new File(Paths.cache, fileName);
  picked.create({ overwrite: true });
  picked.write('jpeg-bytes');
  mockLibrary.mockResolvedValueOnce({
    canceled: false,
    assets: [{ uri: picked.uri, fileName, mimeType: 'image/jpeg', fileSize: 120_000, width: 10, height: 10 }],
  });
  await activate(screen.getByRole('button', { name: /Adicionar anexo/ }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Escolher da galeria' }));
}

const checkboxes = () => screen.getAllByRole('checkbox');
const save = async () => activate(screen.getByTestId('save-record'));

beforeEach(async () => {
  jest.useFakeTimers({
    now: new Date(2026, 10, 11, 12, 0),
    doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'hrtime', 'requestIdleCallback', 'cancelIdleCallback'],
  });
  jest.clearAllMocks();
  await AsyncStorage.clear();
  clearLocalFiles();
});
afterEach(() => jest.useRealTimers());

describe('captura inteligente: leitura e revisão', () => {
  it('a leitura começa sozinha ao anexar e abre a revisão com A6, sugestões e itens desmarcados (F1.4, F1.7, F1.8)', async () => {
    const extractor = extractorOf(LAUDO);
    await setup(extractor);
    await attach();

    expect(await screen.findByText(A6)).toBeOnTheScreen();
    expect(extractor.extract).toHaveBeenCalledTimes(1);
    expect(within(screen.getByTestId('review-title')).getByText('Sugestão', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByLabelText('Título, Hemograma e glicemia, obrigatório, sugestão da leitura, confiança média')).toBeOnTheScreen();
    expect(within(screen.getByTestId('review-professional')).getByText('Dra. Paula Lima')).toBeOnTheScreen();
    expect(screen.getByTestId('type-suggestion')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Sugestão da leitura, confiança alta, trecho lido: Data da coleta: 03\/11\/2026/)).toBeOnTheScreen();
    expect(screen.getByText('Exames (3)')).toBeOnTheScreen();

    expect(checkboxes()).toHaveLength(3);
    for (const box of checkboxes()) expect(box).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /^Hemoglobina, 11,2 gramas por decilitro, abaixo da faixa do laudo/ })).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: /^Plaquetas, 245\.000 por milímetro cúbico, dentro da faixa do laudo/ })).toBeOnTheScreen();
    // F1.8: linha sem unidade aparece com "Confira" e sem valor.
    expect(screen.getByRole('checkbox', { name: /^Glicose em jejum, confira, sem valor lido/ })).toBeOnTheScreen();
    expect(within(screen.getByTestId('found-lab-2')).getByText('Confira')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Salvar registro' })).toBeOnTheScreen();
    expect(screen.queryByText('Escolha a pessoa para ler o documento.')).toBeNull();
    expect(screen.queryByText(A8)).toBeNull();
  });

  it('linha de exame: nome, depois valor e unidade, faixa, estado e o trecho lido entre aspas, sem monoespaçado (C5, A9)', async () => {
    await setup(extractorOf(LAUDO));
    await attach();
    await screen.findByText(A6);
    const row = within(screen.getByTestId('found-lab-0'));
    // Ordem de leitura dentro da linha (o nome não divide mais a 1ª linha com o valor).
    type Json = { props?: { testID?: string }; children?: unknown[] | null };
    const find = (n: unknown): Json | null => {
      if (!n || typeof n !== 'object') return null;
      if (Array.isArray(n)) return n.map(find).find(Boolean) ?? null;
      const node = n as Json;
      return node.props?.testID === 'found-lab-0' ? node : find(node.children);
    };
    const json = JSON.stringify(find(screen.toJSON()));
    const at = (t: string) => json.indexOf(t);
    expect(row.getByTestId('found-lab-0-value')).toHaveTextContent(/11,2\s*g\/dL/);
    expect(row.getByText('Faixa do laudo: 12,0 a 15,5 g/dL')).toBeOnTheScreen();
    expect(row.getByText('Abaixo da faixa')).toBeOnTheScreen();
    expect(at('"Hemoglobina"')).toBeGreaterThan(-1);
    expect(at('"Hemoglobina"')).toBeLessThan(at('"11,2"'));
    expect(at('"11,2"')).toBeLessThan(at('"Faixa do laudo: 12,0'));
    const evidence = row.getByTestId('found-lab-0-evidence');
    expect(evidence).toHaveTextContent(/^“Hemoglobina .*”$/);
    expect(StyleSheet.flatten(evidence.props.style)?.fontFamily ?? '').not.toMatch(/mono/);
  });

  it('a linha selecionável expõe o estado marcado ao leitor de tela', async () => {
    await setup(extractorOf(LAUDO));
    await attach();
    await screen.findByText(A6);
    const row = screen.getByRole('checkbox', { name: /^Hemoglobina/ });
    expect(row.props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent.press(row);
    expect(screen.getByRole('checkbox', { name: /^Hemoglobina/ })).toBeChecked();
    await fireEvent.press(screen.getByRole('checkbox', { name: /^Hemoglobina/ }));
    expect(screen.getByRole('checkbox', { name: /^Hemoglobina/ }).props.accessibilityState).toMatchObject({ checked: false });
  });

  it('anexo sem pessoa: a leitura espera, explica junto ao campo Pessoa e começa ao escolher (C6)', async () => {
    const extractor = extractorOf(LAUDO);
    const { ana } = await setup(extractor, { preset: false, others: ['Bruno Souza'] });
    await attach();
    expect(await screen.findByText('Escolha a pessoa para ler o documento.')).toBeOnTheScreen();
    expect(extractor.extract).not.toHaveBeenCalled();
    expect(screen.getByText('laudo.jpg')).toBeOnTheScreen();

    await chooseOption(/^Pessoa/, ana.id);
    expect(await screen.findByText(A6)).toBeOnTheScreen();
    expect(extractor.extract).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Escolha a pessoa para ler o documento.')).toBeNull();
  });

  it('v4: a folha nativa não tem furos', async () => {
    await setup(extractorOf(LAUDO), { preset: false, others: ['Bruno Souza'] });
    expect(screen.queryAllByTestId('leaf-hole', { includeHiddenElements: true })).toHaveLength(0);
  });

  it('sem anexo e sem pessoa, não há a dica de leitura', async () => {
    await setup(extractorOf(LAUDO), { preset: false, others: ['Bruno Souza'] });
    expect(screen.queryByText('Escolha a pessoa para ler o documento.')).toBeNull();
  });

  it('salva só os itens marcados, ligados ao registro com a data sugerida (F1.4, F1.5)', async () => {
    const { family, records, measurements } = await setup(extractorOf(LAUDO));
    await attach();
    await screen.findByText(A6);

    await fireEvent.press(screen.getByRole('button', { name: 'Selecionar todos' }));
    expect(screen.getByRole('button', { name: 'Salvar registro e 3 itens' })).toBeOnTheScreen();
    await save();
    // A linha "Confira" marcada sem valor bloqueia o salvar; nada é gravado.
    expect(await screen.findByText('Digite um número, por exemplo 13,2.')).toBeOnTheScreen();
    await expect(records.list(family.id)).resolves.toHaveLength(0);

    await fireEvent.press(screen.getByRole('checkbox', { name: /^Glicose em jejum/ }));
    expect(screen.getByRole('button', { name: 'Salvar registro e 2 itens' })).toBeOnTheScreen();
    await save();
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());

    const [record] = await records.list(family.id);
    expect(record).toMatchObject({ type: 'result', title: 'Hemograma e glicemia', date: '2026-11-03', professional: 'Dra. Paula Lima', location: 'Laboratório Vida' });
    const saved = await measurements.listBySourceRecord(record!.id);
    expect(saved.map((m) => [m.code, m.value, m.unit, m.takenOn, m.origin]).sort()).toEqual([
      ['hemoglobin', 11.2, 'g/dL', '2026-11-03', 'ocr'],
      ['platelets', 245000, '/mm³', '2026-11-03', 'ocr'],
    ]);
  });

  it('a linha "Confira" pode receber o valor e entra na contagem (F1.8)', async () => {
    const { family, records, measurements } = await setup(extractorOf(LAUDO));
    await attach();
    await screen.findByText(A6);
    await fireEvent.press(screen.getByRole('checkbox', { name: /^Glicose em jejum/ }));
    await fireEvent.changeText(screen.getByLabelText('Valor'), '104');
    await fireEvent.changeText(screen.getByLabelText(/Unidade/), 'mg/dL');
    expect(screen.getByRole('button', { name: 'Salvar registro e 1 item' })).toBeOnTheScreen();
    await save();
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    const [record] = await records.list(family.id);
    await expect(measurements.listBySourceRecord(record!.id)).resolves.toMatchObject([{ code: 'glucose_fasting', value: 104, unit: 'mg/dL' }]);
  });

  it('a sugestão só preenche campo vazio (S4, Registro)', async () => {
    await setup(extractorOf(LAUDO));
    await fireEvent.changeText(screen.getByTestId('title-input'), 'Exames de novembro');
    await attach();
    await screen.findByText(A6);
    expect(screen.getByLabelText('Título, Exames de novembro, obrigatório')).toBeOnTheScreen();
    expect(within(screen.getByTestId('review-title')).queryByText('Sugestão', { includeHiddenElements: true })).toBeNull();
    expect(within(screen.getByTestId('review-location')).getByText('Laboratório Vida')).toBeOnTheScreen();
  });

  it('mostra a A11 com o nome lido e não bloqueia o salvar (F1.9)', async () => {
    const { family, records } = await setup(extractorOf(LAUDO));
    await attach();
    expect(
      await screen.findByText('O nome no documento parece ser de outra pessoa (Marina Duarte Costa). Confira antes de salvar.'),
    ).toBeOnTheScreen();
    await save();
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    await expect(records.list(family.id)).resolves.toHaveLength(1);
  });

  it('sem A11 quando o primeiro nome aparece na linha do paciente (F1.9)', async () => {
    await setup(extractorOf(SO_REGISTRO));
    await attach();
    await screen.findByText(A6);
    expect(screen.queryByTestId('review-name-mismatch')).toBeNull();
  });

  it.each([
    ['futura', 'Data da coleta: 03/11/2027'],
    ['antes do nascimento', 'Data da coleta: 03/11/1980'],
  ])('data %s fica vazia com "Confira a data" e não é salva (F1.6)', async (_, line) => {
    const { family, records } = await setup(extractorOf(LAUDO.replace('Data da coleta: 03/11/2026', line)));
    await attach();
    await screen.findByText(A6);
    expect(screen.getByText('Confira a data')).toBeOnTheScreen();
    expect(screen.queryByTestId('date-suggestion')).toBeNull();
    await save();
    expect(await screen.findByText('Informe uma data válida.')).toBeOnTheScreen();
    await expect(records.list(family.id)).resolves.toHaveLength(0);
  });

  it('receita: sugere medicamentos com início na data e duração pela R6; sem duração exige a escolha (F1.10)', async () => {
    const { family, records, medications } = await setup(extractorOf(RECEITA));
    await attach('receita.jpg');
    await screen.findByText(A6);
    expect(screen.getByText('Medicamentos (2)')).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: /^Amoxicilina 500 mg, Tomar 1 cápsula de 8 em 8 horas por 7 dias\., Até 16 de nov\. de 2026/ })).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: /^Losartana 50 mg, .*Duração não lida/ })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Selecionar todos' }));
    await save();
    expect(await screen.findByText('Escolha por quanto tempo.')).toBeOnTheScreen();
    await expect(records.list(family.id)).resolves.toHaveLength(0);

    await chooseOption(/Por quanto tempo/, 'continuous');
    await save();
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    const [record] = await records.list(family.id);
    expect(record).toMatchObject({ type: 'prescription', date: '2026-11-10' });
    const saved = await medications.listBySourceRecord(record!.id);
    expect(saved.map((m) => [m.name, m.startOn, m.endOn, m.origin]).sort()).toEqual([
      ['Amoxicilina', '2026-11-10', '2026-11-16', 'ocr'],
      ['Losartana', '2026-11-10', null, 'ocr'],
    ]);
  });

  it('vacina: sugere a dose com data e lote e salva a marcada (F1.11)', async () => {
    const { family, records, vaccineDoses } = await setup(extractorOf(VACINA));
    await attach('vacina.jpg');
    await screen.findByText(A6);
    const row = screen.getByRole('checkbox', { name: 'Influenza, Dose única · 15 de abr. de 2026 · Lote FLU26A0412' });
    expect(row).not.toBeChecked();
    await fireEvent.press(row);
    await save();
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    const [record] = await records.list(family.id);
    await expect(vaccineDoses.listBySourceRecord(record!.id)).resolves.toMatchObject([
      { vaccineCode: 'influenza', doseKey: 'DU', appliedOn: '2026-04-15', lot: 'FLU26A0412', origin: 'ocr' },
    ]);
  });

  it('leitor demo mostra a A8 (F1.12)', async () => {
    await setup(extractorOf(LAUDO, 'demo'));
    await attach();
    await screen.findByText(A6);
    expect(screen.getByText(A8)).toBeOnTheScreen();
  });

  it('sem leitor (Expo Go com Supabase, web) pula a leitura e mostra a A9 (F1.13)', async () => {
    const extractor = { availability: 'unavailable' as const, extract: jest.fn(async () => null) };
    await setup(extractor);
    await attach();
    expect(await screen.findByText(A9)).toBeOnTheScreen();
    expect(extractor.extract).not.toHaveBeenCalled();
    expect(screen.getByTestId('title-input')).toBeOnTheScreen();
    expect(screen.getByText('laudo.jpg')).toBeOnTheScreen();
  });

  it('erro ou estouro dos 20 s: formulário manual com A10 e anexo mantido (F1.2)', async () => {
    const extractor = {
      availability: 'device' as const,
      extract: jest.fn(async () => Promise.reject(new DomainError('ocr/timeout', 'A leitura demorou demais.'))),
    };
    await setup(extractor);
    await attach();
    expect(await screen.findByText(A10)).toBeOnTheScreen();
    expect(screen.getByText('laudo.jpg')).toBeOnTheScreen();
    expect(screen.getByTestId('title-input')).toBeOnTheScreen();
    expect(screen.queryByText(A6)).toBeNull();
  });

  it('"Pular leitura" cancela e volta ao formulário sem aviso, com o anexo', async () => {
    const extractor = {
      availability: 'device' as const,
      extract: jest.fn<ReturnType<Extract>, Parameters<Extract>>(
        (_file, options) =>
          new Promise((_, reject) => options?.signal?.addEventListener('abort', () => reject(new DomainError('ocr/cancelled', 'Leitura cancelada.')))),
      ),
    };
    await setup(extractor);
    await attach();
    expect(await screen.findByText('Lendo o documento…')).toBeOnTheScreen();
    await activate(screen.getByRole('button', { name: 'Pular leitura' }));
    expect(await screen.findByTestId('title-input')).toBeOnTheScreen();
    expect(screen.getByText('laudo.jpg')).toBeOnTheScreen();
    expect(screen.queryByText(A10)).toBeNull();
  });

  it('só o registro sugerido, sem itens: mostra o estado parcial', async () => {
    await setup(extractorOf(SO_REGISTRO));
    await attach();
    expect(await screen.findByText('Nenhum exame, vacina ou medicamento encontrado. Você pode adicionar depois.')).toBeOnTheScreen();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('"Descartar a leitura?" apaga as sugestões e mantém o anexo (F1.14)', async () => {
    await setup(extractorOf(LAUDO));
    await attach();
    await screen.findByText(A6);
    await activate(screen.getByRole('button', { name: 'Descartar a leitura' }));
    expect(await screen.findByText('Descartar a leitura?')).toBeOnTheScreen();
    await activate(screen.getAllByRole('button', { name: 'Descartar a leitura' }).at(-1)!);

    expect(await screen.findByTestId('title-input')).toHaveDisplayValue('');
    expect(screen.queryByText(A6)).toBeNull();
    expect(screen.queryByText(/Marina Duarte Costa/)).toBeNull();
    expect(screen.getByText('laudo.jpg')).toBeOnTheScreen();
  });

  it('o texto lido não fica no AsyncStorage depois da revisão e do salvar (F1.15)', async () => {
    await setup(extractorOf(LAUDO));
    await attach();
    await screen.findByText(A6);
    await fireEvent.press(screen.getByRole('checkbox', { name: /^Hemoglobina/ }));
    await save();
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());

    const stored = JSON.stringify(await AsyncStorage.multiGet(await AsyncStorage.getAllKeys()));
    expect(stored).toContain('hemoglobin'); // o item marcado foi salvo...
    expect(stored).not.toContain('Marina Duarte'); // ...mas o nome lido (P4) e
    expect(stored).not.toContain('Hemoglobina .....'); // o trecho do documento não.
    expect(stored).not.toContain('Médico solicitante');
  });

  it('a revisão não usa palavras vetadas nem exclamação (métrica "Calma")', async () => {
    await setup(extractorOf(RECEITA));
    await attach('receita.jpg');
    await screen.findByText(A6);
    const texts = screen.getAllByText(/./).map((n) => String(n.props.children));
    expect(texts.join(' ')).not.toMatch(BANNED);
  });
});
