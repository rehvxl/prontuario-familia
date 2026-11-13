import type { ReactNode } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/shared/ui';
import { DEPENDENCY_KEYS, newId } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { createLocalMemberRepository } from '@/entities/member';
import { createLocalMedicationRepository } from '@/entities/medication';
import { createLocalEmergencyCardRepository, emergencyCardFieldsSchema } from '@/entities/emergency-card';
import { PresentEmergencyCardScreen } from './PresentEmergencyCardScreen';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: () => undefined }));

let mockParams: Record<string, string> = {};

function setOs(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

async function setup() {
  const db = createMemoryDb();
  const members = createLocalMemberRepository(db);
  const member = await members.create({ familyId: newId(), fullName: 'Ana Souza', birthDate: '1959-03-01', relationship: 'parent', sex: 'female' });
  await createLocalEmergencyCardRepository(db).upsert(member.id, member.familyId, emergencyCardFieldsSchema.parse({
    bloodType: 'A-',
    allergies: [{ name: 'Dipirona', reaction: 'urticária' }],
  }));
  const { wrapper: Deps } = renderWithDependencies({
    [DEPENDENCY_KEYS.auth]: { getCurrentUser: async () => ({ id: 'user-1', email: null, displayName: null, provider: 'email' }), onAuthStateChange: () => () => undefined },
    [DEPENDENCY_KEYS.members]: members,
    [DEPENDENCY_KEYS.medications]: createLocalMedicationRepository(db),
    [DEPENDENCY_KEYS.emergencyCards]: createLocalEmergencyCardRepository(db),
    [DEPENDENCY_KEYS.records]: { list: async () => [] },
  });
  mockParams = { id: member.id };
  const wrapper = ({ children }: { children?: ReactNode }) => (
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
      <ThemeProvider scheme="light" reducedMotion><Deps>{children}</Deps></ThemeProvider>
    </SafeAreaProvider>
  );
  return { wrapper };
}

describe('modo profissional', () => {
  it('ordena a leitura, deixa Fechar visível e não usa outra tinta na alergia', async () => {
    const { wrapper } = await setup();
    await render(<PresentEmergencyCardScreen />, { wrapper });
    expect(await screen.findByText('Dipirona')).toBeOnTheScreen();
    const headers = screen.getAllByRole('header').map((node) => String(node.props.children));
    expect(headers.indexOf('Ana Souza')).toBeLessThan(headers.indexOf('Alergias'));
    expect(headers.indexOf('Alergias')).toBeLessThan(headers.indexOf('Condições de saúde informadas'));
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Fechar a tela para o profissional')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Editar ficha' })).toBeNull();
    expect(StyleSheet.flatten(screen.getByText('Dipirona').props.style).color).toBe(StyleSheet.flatten(screen.getByText('Ana Souza').props.style).color);
    expect(screen.getByText('Ana Souza').props.allowFontScaling).toBe(true);
  });
});

describe('modo profissional sem a ficha', () => {
  it('mostra o fechar quando a pessoa não é encontrada', async () => {
    const { wrapper: Deps } = renderWithDependencies({
      [DEPENDENCY_KEYS.auth]: { getCurrentUser: async () => ({ id: 'user-1', email: null, displayName: null, provider: 'email' }), onAuthStateChange: () => () => undefined },
      [DEPENDENCY_KEYS.members]: { getById: async () => null },
      [DEPENDENCY_KEYS.medications]: { listByMember: async () => [] },
      [DEPENDENCY_KEYS.emergencyCards]: { getByMember: async () => null },
      [DEPENDENCY_KEYS.records]: { list: async () => [] },
    });
    mockParams = { id: 'm-1' };
    const wrapper = ({ children }: { children?: ReactNode }) => (
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
        <ThemeProvider scheme="light" reducedMotion><Deps>{children}</Deps></ThemeProvider>
      </SafeAreaProvider>
    );
    await render(<PresentEmergencyCardScreen />, { wrapper });
    expect(await screen.findByText('Não foi possível abrir a ficha agora.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Fechar a tela para o profissional')).toBeOnTheScreen();
  });
});

describe('fechar o modo profissional', () => {
  const os = Platform.OS;

  beforeEach(() => {
    mockRouter.back.mockClear();
    mockRouter.replace.mockClear();
    mockRouter.canGoBack.mockReturnValue(true);
    setOs('web');
  });

  afterEach(() => setOs(os));

  async function shown() {
    const { wrapper } = await setup();
    await render(<PresentEmergencyCardScreen />, { wrapper });
    expect(await screen.findByText('Dipirona')).toBeOnTheScreen();
  }

  async function pressBoth() {
    await fireEvent.press(screen.getByRole('button', { name: 'Fechar' }));
    await fireEvent.press(screen.getByLabelText('Fechar a tela para o profissional'));
  }

  it('com histórico, os dois Fechar voltam', async () => {
    await shown();
    await pressBoth();
    expect(mockRouter.back).toHaveBeenCalledTimes(2);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('na web sem histórico, os dois Fechar abrem a leitura da mesma pessoa sem empilhar', async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    await shown();
    await pressBoth();
    const reading = { pathname: '/(main)/member/[id]/emergency', params: { id: mockParams.id } };
    expect(mockRouter.replace).toHaveBeenNthCalledWith(1, reading);
    expect(mockRouter.replace).toHaveBeenNthCalledWith(2, reading);
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it.each(['ios', 'android'] as const)('no %s sem histórico, Fechar continua voltando', async (platform) => {
    setOs(platform);
    mockRouter.canGoBack.mockReturnValue(false);
    await shown();
    await fireEvent.press(screen.getByRole('button', { name: 'Fechar' }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
