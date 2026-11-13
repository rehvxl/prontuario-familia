import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/shared/ui';
import { DEPENDENCY_KEYS, newId } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { createLocalMemberRepository } from '@/entities/member';
import { createLocalMedicationRepository } from '@/entities/medication';
import { createLocalEmergencyCardRepository, emergencyCardFieldsSchema } from '@/entities/emergency-card';
import { PresentEmergencyCardScreen } from './PresentEmergencyCardScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: () => undefined }));

let mockParams: Record<string, string> = {};

const v3 = [
  { purpose: 'terms_and_privacy' as const, version: '2026-11-v3', acceptedAt: '2026-11-01T00:00:00.000Z', revokedAt: null },
  { purpose: 'health_data_processing' as const, version: '2026-11-v3', acceptedAt: '2026-11-01T00:00:00.000Z', revokedAt: null },
];

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
    [DEPENDENCY_KEYS.consents]: { listMine: async () => v3 },
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
