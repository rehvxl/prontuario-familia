import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/shared/ui';
import { DEPENDENCY_KEYS, newId } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { createLocalMemberRepository } from '@/entities/member';
import { createLocalMedicationRepository } from '@/entities/medication';
import { createLocalEmergencyCardRepository, emergencyCardFieldsSchema } from '@/entities/emergency-card';
import { EditEmergencyCardScreen } from './EditEmergencyCardScreen';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
  usePreventRemove: () => undefined,
}));

let mockParams: Record<string, string> = {};

function setOs(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

const v3 = [
  { purpose: 'terms_and_privacy' as const, version: '2026-11-v3', acceptedAt: '2026-11-01T00:00:00.000Z', revokedAt: null },
  { purpose: 'health_data_processing' as const, version: '2026-11-v3', acceptedAt: '2026-11-01T00:00:00.000Z', revokedAt: null },
];

async function setup() {
  const db = createMemoryDb();
  const members = createLocalMemberRepository(db);
  const member = await members.create({ familyId: newId(), fullName: 'Ana Souza', birthDate: '1959-03-01', relationship: 'parent', sex: 'female' });
  await createLocalEmergencyCardRepository(db).upsert(member.id, member.familyId, emergencyCardFieldsSchema.parse({
    allergies: [{ name: 'Dipirona', reaction: 'urticária' }],
  }));
  const { wrapper: Deps } = renderWithDependencies({
    [DEPENDENCY_KEYS.auth]: { getCurrentUser: async () => ({ id: 'user-1', email: null, displayName: null, provider: 'email' }), onAuthStateChange: () => () => undefined },
    [DEPENDENCY_KEYS.members]: members,
    [DEPENDENCY_KEYS.medications]: createLocalMedicationRepository(db),
    [DEPENDENCY_KEYS.emergencyCards]: createLocalEmergencyCardRepository(db),
    [DEPENDENCY_KEYS.records]: { list: async () => [] },
    [DEPENDENCY_KEYS.consents]: { listMine: async () => v3 },
  });
  mockParams = { memberId: member.id };
  const wrapper = ({ children }: { children?: ReactNode }) => (
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
      <ThemeProvider scheme="light" reducedMotion><Deps>{children}</Deps></ThemeProvider>
    </SafeAreaProvider>
  );
  return { wrapper };
}

describe('edição da ficha', () => {
  const os = Platform.OS;

  beforeEach(() => {
    mockRouter.back.mockClear();
    mockRouter.replace.mockClear();
    mockRouter.push.mockClear();
    mockRouter.canGoBack.mockReturnValue(true);
  });

  afterEach(() => setOs(os));

  it('confirma antes de apagar as alergias listadas e não abre “Sair sem salvar?”', async () => {
    const { wrapper } = await setup();
    await render(<EditEmergencyCardScreen />, { wrapper });
    expect(await screen.findByDisplayValue('Dipirona')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('checkbox', { name: /Sem alergias conhecidas/ }));
    expect(await screen.findByText('Apagar as alergias listadas?')).toBeOnTheScreen();
    expect(screen.queryByText('Sair sem salvar?')).toBeNull();
  });

  async function save() {
    const { wrapper } = await setup();
    await render(<EditEmergencyCardScreen />, { wrapper });
    expect(await screen.findByDisplayValue('Dipirona')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar ficha' }));
  }

  it('depois de salvar, com histórico, volta', async () => {
    setOs('web');
    await save();
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('depois de salvar, na web sem histórico, volta para a leitura sem empilhar', async () => {
    setOs('web');
    mockRouter.canGoBack.mockReturnValue(false);
    await save();
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/(main)/member/[id]/emergency', params: { id: mockParams.memberId } }),
    );
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});
