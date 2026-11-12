import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { clearLocalFiles } from '@/shared/lib';
import type { AppEnv } from '@/shared/config';
import { ThemeProvider } from '@/shared/ui';
import EditMemberRoute from '@/app/(main)/member/[id]/edit';
import MemberRoute from '@/app/(main)/member/[id]/index';
import RecordDetailRoute from '@/app/(main)/record/[id]';
import ExamsRoute from '@/app/(main)/member/[id]/exams/index';
import ExamSeriesRoute from '@/app/(main)/member/[id]/exams/[series]';
import VaccinesRoute from '@/app/(main)/member/[id]/vaccines';
import MedicationsRoute from '@/app/(main)/member/[id]/medications';
import VitalsRoute from '@/app/(main)/member/[id]/vitals/[code]';
import NewMeasurementRoute from '@/app/(main)/measurement/new';
import NewVaccineDoseRoute from '@/app/(main)/vaccine-dose/new';
import NewMedicationRoute from '@/app/(main)/medication/new';
import NewVitalRoute from '@/app/(main)/vital/new';
import MainLayout from '@/app/(main)/_layout';
import SettingsRoute from '@/app/(main)/(tabs)/(settings)/index';
import WelcomeRoute from '@/app/(onboarding)/welcome';
import { AppProviders, createContainer, useDeviceConsentStore, type AppContainer } from '@/application';

const mockRedirects: { href: unknown }[] = [];
const mockBackButtons: { displayMode?: string; children?: string }[] = [];
const mockScreens: { name: string; options?: Record<string, unknown> }[] = [];
const mockToolbarButtons: { icon?: string; accessibilityLabel?: string }[] = [];
const mockSettingsProps: { mode?: string; loadDemoFamily?: { mutate: unknown } }[] = [];

jest.mock('expo-router', () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => children;
  const Screen = Object.assign(
    (props: { name: string; options?: Record<string, unknown> }) => {
      mockScreens.push(props);
      return null;
    },
    {
      BackButton: (props: { displayMode?: string; children?: string }) => {
        mockBackButtons.push(props);
        return null;
      },
    },
  );
  const Toolbar = Object.assign(({ children }: { children?: React.ReactNode }) => children, {
    Button: (props: { icon?: string; accessibilityLabel?: string }) => {
      mockToolbarButtons.push(props);
      return null;
    },
  });
  return {
    Redirect: (props: { href: unknown }) => {
      mockRedirects.push(props);
      return null;
    },
    Stack: Object.assign(Passthrough, { Screen, Toolbar }),
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
    useLocalSearchParams: () => ({ id: 'carlos', view: 'documents' }),
  };
});
jest.mock('@/screens/manage-member', () => ({ EditMemberScreen: () => null }));
jest.mock('@/screens/record-detail', () => ({ RecordDetailScreen: () => null }));
jest.mock('@/screens/member-exams', () => ({ MemberExamsScreen: () => null }));
jest.mock('@/screens/exam-series', () => ({ ExamSeriesScreen: () => null }));
jest.mock('@/screens/member-vaccines', () => ({ MemberVaccinesScreen: () => null }));
jest.mock('@/screens/member-medications', () => ({ MemberMedicationsScreen: () => null }));
jest.mock('@/screens/member-vitals', () => ({ MemberVitalsScreen: () => null }));
jest.mock('@/screens/new-measurement', () => ({ NewMeasurementScreen: () => null }));
jest.mock('@/screens/new-vaccine-dose', () => ({ NewVaccineDoseScreen: () => null }));
jest.mock('@/screens/new-medication', () => ({ NewMedicationScreen: () => null }));
jest.mock('@/screens/new-vital', () => ({ NewVitalScreen: () => null }));
jest.mock('@/screens/settings', () => ({
  SettingsScreen: (props: { mode?: string; loadDemoFamily?: { mutate: unknown } }) => {
    mockSettingsProps.push(props);
    return null;
  },
}));

const env: AppEnv = { supabaseUrl: null, supabaseAnonKey: null, googleAuthEnabled: false, backendMode: 'demo' };
const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

let container: AppContainer;
let queryClient: QueryClient;

const renderRoute = (ui: React.ReactElement) =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ThemeProvider scheme="light" reducedMotion>
        <AppProviders container={container} queryClient={queryClient}>
          {ui}
        </AppProviders>
      </ThemeProvider>
    </SafeAreaProvider>,
  );

beforeEach(async () => {
  mockRedirects.length = 0;
  mockBackButtons.length = 0;
  mockScreens.length = 0;
  mockToolbarButtons.length = 0;
  mockSettingsProps.length = 0;
  await AsyncStorage.clear();
  clearLocalFiles();
  useDeviceConsentStore.setState({ acceptedVersion: null, hydrated: true });
  container = createContainer(env);
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
});

afterEach(() => queryClient.clear());

describe('endereço antigo da pessoa', () => {
  it('leva ao painel da família já na divisória da pessoa (casca única, sem empilhar tela)', async () => {
    await renderRoute(<MemberRoute />);
    expect(mockRedirects.at(-1)).toEqual({ href: { pathname: '/(main)/(tabs)/(family)', params: { member: 'carlos', view: 'documents' } } });
  });
});

describe('botão voltar das rotas dentro das abas (BUG-03)', () => {
  it.each([
    ['editar pessoa', EditMemberRoute],
    ['detalhe do registro', RecordDetailRoute],
    ['exames da pessoa', ExamsRoute],
    ['série de um exame', ExamSeriesRoute],
    ['vacinas da pessoa', VaccinesRoute],
    ['medicamentos da pessoa', MedicationsRoute],
    ['sinal vital da pessoa', VitalsRoute],
  ])('%s nomeia o voltar "Voltar", só com o ícone, e não herda "(tabs)"', async (_name, Route) => {
    await renderRoute(<Route />);
    expect(mockBackButtons.at(-1)).toEqual({ displayMode: 'minimal', children: 'Voltar' });
    expect(JSON.stringify(mockBackButtons)).not.toContain('(tabs)');
  });
});

describe('entrada do onboarding (BUG-09)', () => {
  it('instalação nova (sem sessão) mostra as boas-vindas', async () => {
    await renderRoute(<WelcomeRoute />);
    expect(await screen.findByTestId('welcome-screen')).toBeOnTheScreen();
    expect(mockRedirects).toHaveLength(0);
  });

  it('com sessão aberta (consentimento revogado) pula as boas-vindas e vai ao consentimento', async () => {
    await container.auth.verifyEmailOtp('ana@exemplo.com', '123456');
    await renderRoute(<WelcomeRoute />);
    await waitFor(() => expect(mockRedirects.at(-1)).toEqual({ href: '/(onboarding)/consent' }));
    expect(screen.queryByTestId('welcome-screen')).toBeNull();
  });
});

describe('rotas da v0.2 (spec §9)', () => {
  it.each([
    ['novo resultado', NewMeasurementRoute],
    ['nova dose', NewVaccineDoseRoute],
    ['novo medicamento', NewMedicationRoute],
    ['novo sinal vital', NewVitalRoute],
  ])('folha de %s tem o botão "Fechar"', async (_name, Route) => {
    await renderRoute(<Route />);
    expect(mockToolbarButtons).toEqual([expect.objectContaining({ icon: 'xmark', accessibilityLabel: 'Fechar' })]);
  });

  it('o Stack principal registra as telas da pessoa e abre os formulários como formSheet', async () => {
    await renderRoute(<MainLayout />);
    const options = Object.fromEntries(mockScreens.map((s) => [s.name, s.options ?? {}]));
    expect(options).toMatchObject({
      'member/[id]/exams/index': { title: 'Exames' },
      'member/[id]/exams/[series]': { title: 'Exame' },
      'member/[id]/vaccines': { title: 'Vacinas' },
      'member/[id]/medications': { title: 'Medicamentos' },
      'member/[id]/vitals/[code]': { title: 'Sinais vitais' },
    });
    const sheets = { 'member/new': 'Nova pessoa', 'record/new': 'Novo registro', 'measurement/new': 'Novo resultado', 'vaccine-dose/new': 'Nova dose', 'medication/new': 'Novo medicamento', 'vital/new': 'Novo sinal vital' };
    for (const [name, title] of Object.entries(sheets)) {
      expect(options[name]).toEqual({ title, presentation: 'formSheet', sheetAllowedDetents: [0.8, 1], sheetGrabberVisible: true, headerTransparent: false });
    }
  });
});

describe('Ajustes: família de exemplo (ARCHITECTURE §3, Q10)', () => {
  it('no modo demo passa a ação "Carregar família de exemplo" à tela', async () => {
    await renderRoute(<SettingsRoute />);
    expect(mockSettingsProps.at(-1)).toMatchObject({ mode: 'demo', loadDemoFamily: { mutate: expect.any(Function) } });
  });

  it('fora do modo demo não passa a ação', async () => {
    container = { ...container, mode: 'supabase' };
    await renderRoute(<SettingsRoute />);
    expect(mockSettingsProps.at(-1)?.mode).toBe('supabase');
    expect(mockSettingsProps.at(-1)?.loadDemoFamily).toBeUndefined();
  });
});
