import type { ReactElement } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { Text } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { CURRENT_TERMS_VERSION } from '@/entities/consent';
import { ConsentScreen } from '@/screens/consent';
import { CreateFamilyScreen } from '@/screens/create-family';
import { FirstMembersScreen } from '@/screens/first-members';
import { MemberTimelineScreen } from '@/screens/member-timeline';
import { NewRecordScreen } from '@/screens/new-record';
import { RecordDetailScreen } from '@/screens/record-detail';
import { SearchScreen } from '@/screens/search';
import { VerifyCodeScreen } from '@/screens/verify-code';
import type { AppEnv } from '@/shared/config';
import { clearLocalFiles } from '@/shared/lib';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/shared/ui';
import { createContainer, type AppContainer } from './container';
import { AppProviders } from './providers';
import { useConsentFlow, useDeviceConsentStore, useSessionState } from './session';

// ---- mocks de infraestrutura nativa ---------------------------------------------------------------------------

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => {
  /* eslint-disable @typescript-eslint/no-require-imports -- fábrica de jest.mock não pode usar imports de topo */
  const React = require('react');
  const { Pressable, TextInput } = require('react-native');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const Toolbar = Object.assign(({ children }: { children?: unknown }) => React.createElement(React.Fragment, null, children), {
    Button: ({ accessibilityLabel, onPress }: { accessibilityLabel: string; onPress: () => void }) =>
      React.createElement(Pressable, {
        accessibilityRole: 'button',
        accessibilityLabel,
        onPress,
      }),
  });
  const Stack = {
    Screen: () => null,
    Title: () => null,
    Toolbar,
    SearchBar: ({ onChangeText }: { onChangeText: (e: { nativeEvent: { text: string } }) => void }) =>
      React.createElement(TextInput, {
        testID: 'search-input',
        onChangeText: (text: string) => onChangeText({ nativeEvent: { text } }),
      }),
  };
  return {
    Stack,
    Redirect: () => null,
    useRouter: () => mockRouter,
    useLocalSearchParams: () => mockParams,
  };
});

const mockLibrary = jest.fn();
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: null })),
  launchImageLibraryAsync: (...args: unknown[]) => mockLibrary(...args),
}));
// ActionSheet.ios/BottomSheet.ios são folhas nativas do SwiftUI (sem árvore RN tocável): nos testes usa as variantes em React Native.
jest.mock('@/shared/ui/components/BottomSheet.ios', () => jest.requireActual('@/shared/ui/components/BottomSheet.tsx'));
jest.mock('@/shared/ui/components/ActionSheet.ios', () => jest.requireActual('@/shared/ui/components/ActionSheet.tsx'));
jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: null })),
}));

// ---- apoio ----------------------------------------------------------------------------------------------------

const demoEnv: AppEnv = {
  supabaseUrl: null,
  supabaseAnonKey: null,
  googleAuthEnabled: false,
  backendMode: 'demo',
};

const SAFE_AREA = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

let container: AppContainer;
let queryClient: QueryClient;

async function renderApp(ui: ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <ThemeProvider scheme="light" reducedMotion>
        <AppProviders container={container} queryClient={queryClient}>
          {ui}
        </AppProviders>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

/** Entra na conta demo e cria uma família com Ana (e, opcionalmente, o registro de exemplo). */
async function seedFamily() {
  await container.auth.verifyEmailOtp('ana@exemplo.com', '123456');
  const family = await container.families.createFamily('Souza');
  const ana = await container.members.create({
    familyId: family.id,
    fullName: 'Ana Souza',
    birthDate: '1990-05-01',
    relationship: 'self',
    sex: 'female',
  });
  return { family, ana };
}

async function seedRecord(
  familyId: string,
  memberId: string,
  over: {
    type?: 'exam' | 'consultation';
    title: string;
    date: string;
    notes?: string;
  },
) {
  return container.records.create({
    familyId,
    memberId,
    type: over.type ?? 'exam',
    title: over.title,
    date: over.date,
    location: null,
    professional: null,
    notes: over.notes ?? null,
  });
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockParams = {};
  await AsyncStorage.clear();
  clearLocalFiles();
  useDeviceConsentStore.setState({ acceptedVersion: null, hydrated: true });
  container = createContainer(demoEnv);
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: 0 },
    },
  });
});

afterEach(() => {
  queryClient.clear();
});

// ---- fluxos ---------------------------------------------------------------------------------------------------

function ConsentRoute() {
  return <ConsentScreen flow={useConsentFlow()} />;
}

describe('consentimento', () => {
  it('só habilita o botão com as duas caixas marcadas e grava o aceite no aparelho', async () => {
    await renderApp(<ConsentRoute />);
    const button = () => screen.getByRole('button', { name: 'Aceitar e continuar' });
    const terms = () => screen.getByRole('checkbox', { name: /Termos de Uso/ });
    const health = () => screen.getByRole('checkbox', { name: /dados de saúde/ });

    expect(button()).toBeDisabled();
    await fireEvent.press(terms());
    expect(button()).toBeDisabled();
    await fireEvent.press(health());
    expect(button()).toBeEnabled();

    await act(async () => {
      await fireEvent.press(button());
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    await waitFor(() => expect(useDeviceConsentStore.getState().acceptedVersion).not.toBeNull());
    await waitFor(() => expect(queryClient.isMutating()).toBe(0));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  });
});

describe('login por código (modo demo)', () => {
  it('mostra o aviso de demonstração e o código 123456 leva à etapa seguinte (família)', async () => {
    mockParams = { email: 'ana@exemplo.com' };
    useDeviceConsentStore.setState({ acceptedVersion: CURRENT_TERMS_VERSION, hydrated: true });
    function Probe() {
      return (
        <>
          <VerifyCodeScreen demo />
          <StepProbe />
        </>
      );
    }
    await renderApp(<Probe />);
    expect(screen.getByTestId('demo-banner')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByTestId('otp-input'), '123456');
    await waitFor(() => expect(screen.getByTestId('step')).toHaveTextContent('family'));
    await expect(container.auth.getCurrentUser()).resolves.toMatchObject({
      email: 'ana@exemplo.com',
    });
  });

  it('código errado mostra mensagem e não entra', async () => {
    mockParams = { email: 'ana@exemplo.com' };
    await renderApp(<VerifyCodeScreen demo />);
    await fireEvent.changeText(screen.getByTestId('otp-input'), '000000');
    await waitFor(() => expect(screen.getByText(/Código inválido ou expirado/)).toBeOnTheScreen());
    await expect(container.auth.getCurrentUser()).resolves.toBeNull();
  });
});

function StepProbe() {
  const session = useSessionState();
  return <Text testID="step">{session.nextStep ?? 'loading'}</Text>;
}

describe('criar família e primeira pessoa', () => {
  it('cria a família e segue para o passo de pessoas', async () => {
    await container.auth.verifyEmailOtp('ana@exemplo.com', '123456');
    await renderApp(<CreateFamilyScreen />);

    await fireEvent.changeText(screen.getByTestId('family-name-input'), 'Souza');
    await fireEvent.press(screen.getByRole('button', { name: /continuar|criar/i }));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(setup)/members'));
    await expect(container.families.getMyFamily()).resolves.toMatchObject({
      name: 'Souza',
    });
  });

  it('cadastra a primeira pessoa e libera "Concluir"', async () => {
    const { family } = await seedFamily();
    await container.members.remove((await container.members.listByFamily(family.id))[0]!.id);
    await renderApp(<FirstMembersScreen />);
    await waitFor(() => expect(screen.getByTestId('member-name')).toBeOnTheScreen());
    expect(screen.queryByTestId('finish-setup')).toBeNull();

    await fireEvent.changeText(screen.getByTestId('member-name'), 'Bruno Souza');
    // Parentesco é um menu nativo (MenuView): dispara a ação como o sistema faria.
    await fireEvent(screen.getByRole('button', { name: /Parentesco/ }), 'pressAction', { nativeEvent: { event: 'child' } });
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar primeira pessoa' }));

    await waitFor(async () => expect(await container.members.listByFamily(family.id)).toHaveLength(1));
    await waitFor(() => expect(screen.getByTestId('finish-setup')).toBeOnTheScreen());
    expect((await container.members.listByFamily(family.id))[0]).toMatchObject({
      fullName: 'Bruno Souza',
      relationship: 'child',
    });
  });
});

describe('novo registro', () => {
  it('sem anexo: valida o título e depois salva e aparece na linha do tempo', async () => {
    const { family, ana } = await seedFamily();
    mockParams = { memberId: ana.id };
    await renderApp(<NewRecordScreen />);
    await waitFor(() => expect(screen.getByTestId('title-input')).toBeOnTheScreen());

    await fireEvent(screen.getByTestId('type-select'), 'pressAction', {
      nativeEvent: { event: 'exam' },
    });
    await fireEvent.press(screen.getByTestId('save-record'));
    expect(await screen.findByText('Informe um título para o registro.')).toBeOnTheScreen();
    await expect(container.records.list(family.id)).resolves.toHaveLength(0);

    await fireEvent.changeText(screen.getByTestId('title-input'), 'Hemograma completo');
    await fireEvent.press(screen.getByTestId('save-record'));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    const saved = await container.records.list(family.id);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      title: 'Hemograma completo',
      type: 'exam',
      memberId: ana.id,
    });
  });

  it('com anexo mockado (galeria): lista o arquivo, permite remover e salva com o anexo', async () => {
    const { family, ana } = await seedFamily();
    mockParams = { memberId: ana.id };
    const picked = new File(Paths.cache, 'receita.jpg');
    picked.create({ overwrite: true });
    picked.write('jpeg-bytes');
    mockLibrary.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: picked.uri,
          fileName: 'receita.jpg',
          mimeType: 'image/jpeg',
          fileSize: 120_000,
          width: 10,
          height: 10,
        },
      ],
    });
    await renderApp(<NewRecordScreen />);
    await waitFor(() => expect(screen.getByTestId('title-input')).toBeOnTheScreen());

    await fireEvent(screen.getByTestId('type-select'), 'pressAction', {
      nativeEvent: { event: 'prescription' },
    });
    await fireEvent.changeText(screen.getByTestId('title-input'), 'Receita amoxicilina');
    await fireEvent.press(screen.getByRole('button', { name: /Adicionar anexo/ }));
    await screen.findByText('Escolher da galeria');
    await fireEvent.press(screen.getByRole('button', { name: 'Escolher da galeria' }));
    await waitFor(() => expect(mockLibrary).toHaveBeenCalled(), { timeout: 3000 });
    expect(await screen.findByText('receita.jpg', {}, { timeout: 3000 })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Remover anexo receita.jpg' }));
    expect(screen.queryByText('receita.jpg')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: /Adicionar anexo/ }));
    await fireEvent.press(await screen.findByText('Escolher da galeria'));
    expect(await screen.findByText('receita.jpg')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('save-record'));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    const [record] = await container.records.list(family.id);
    expect(record?.attachments).toHaveLength(1);
    expect(record?.attachments[0]).toMatchObject({
      fileName: 'receita.jpg',
      mimeType: 'image/jpeg',
    });
  });
});

describe('linha do tempo', () => {
  it('agrupa por mês, filtra por tipo e mostra o estado vazio do filtro', async () => {
    const { family, ana } = await seedFamily();
    await seedRecord(family.id, ana.id, {
      title: 'Hemograma completo',
      date: '2026-03-10',
    });
    await seedRecord(family.id, ana.id, {
      type: 'consultation',
      title: 'Consulta cardiologista',
      date: '2026-02-02',
    });
    mockParams = { id: ana.id };
    await renderApp(<MemberTimelineScreen />);

    expect(await screen.findByText('Hemograma completo')).toBeOnTheScreen();
    expect(screen.getByText('Consulta cardiologista')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Consulta' }));
    await waitFor(() => expect(screen.queryByText('Hemograma completo')).toBeNull());
    expect(screen.getByText('Consulta cardiologista')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Consulta' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Vacina' }));
    expect(await screen.findByText('Nenhum registro deste tipo')).toBeOnTheScreen();
  });

  it('sem registros mostra o estado vazio com ação de adicionar', async () => {
    const { ana } = await seedFamily();
    mockParams = { id: ana.id };
    await renderApp(<MemberTimelineScreen />);
    expect(await screen.findByText(/Ainda não há documentos de Ana Souza/)).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Adicionar registro' }).at(-1)!);
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(main)/record/new',
      params: { memberId: ana.id },
    });
  });
});

describe('busca', () => {
  it('pede um termo, encontra por texto e mostra o nome da pessoa', async () => {
    const { family, ana } = await seedFamily();
    await seedRecord(family.id, ana.id, {
      title: 'Hemograma completo',
      date: '2026-03-10',
    });
    await seedRecord(family.id, ana.id, {
      type: 'consultation',
      title: 'Consulta cardiologista',
      date: '2026-02-02',
    });
    await renderApp(<SearchScreen />);

    expect(await screen.findByText('Busque no histórico da família')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByTestId('search-input'), 'hemo');
    expect(await screen.findByText('Hemograma completo')).toBeOnTheScreen();
    expect(screen.queryByText('Consulta cardiologista')).toBeNull();
    expect(screen.getByText(/Ana Souza/)).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByTestId('search-input'), 'zzzz');
    expect(await screen.findByText('Nada encontrado')).toBeOnTheScreen();
  });
});

describe('excluir registro', () => {
  it('confirma, apaga, volta e some da linha do tempo e da busca', async () => {
    const { family, ana } = await seedFamily();
    const record = await seedRecord(family.id, ana.id, {
      title: 'Hemograma completo',
      date: '2026-03-10',
    });
    mockParams = { id: record.id };
    await renderApp(<RecordDetailScreen />);

    expect(await screen.findByText('Hemograma completo')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('delete-record'));
    expect(await screen.findByText('Excluir este registro?')).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Excluir registro' }).find((b) => b.props.testID !== 'delete-record')!);

    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    await expect(container.records.getById(record.id)).resolves.toBeNull();
    await expect(container.records.list(family.id)).resolves.toHaveLength(0);
  });

  it('cancelar na confirmação não apaga', async () => {
    const { family, ana } = await seedFamily();
    const record = await seedRecord(family.id, ana.id, {
      title: 'Hemograma completo',
      date: '2026-03-10',
    });
    mockParams = { id: record.id };
    await renderApp(<RecordDetailScreen />);

    await screen.findByText('Hemograma completo');
    await fireEvent.press(screen.getByTestId('delete-record'));
    await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(mockRouter.back).not.toHaveBeenCalled();
    await expect(container.records.list(family.id)).resolves.toHaveLength(1);
  });
});
