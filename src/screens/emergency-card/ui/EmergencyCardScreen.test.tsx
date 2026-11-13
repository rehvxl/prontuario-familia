import type { ReactNode } from 'react';
import { Linking } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/shared/ui';
import { DEPENDENCY_KEYS, newId } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { createLocalMemberRepository } from '@/entities/member';
import { createLocalMedicationRepository } from '@/entities/medication';
import { createLocalEmergencyCardRepository, emergencyCardFieldsSchema } from '@/entities/emergency-card';
import { EmergencyCardScreen } from './EmergencyCardScreen';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
  usePreventRemove: () => undefined,
  useFocusEffect: () => undefined,
}));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: () => undefined }));

const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

const v3 = [
  { purpose: 'terms_and_privacy' as const, version: '2026-11-v3', acceptedAt: '2026-11-01T00:00:00.000Z', revokedAt: null },
  { purpose: 'health_data_processing' as const, version: '2026-11-v3', acceptedAt: '2026-11-01T00:00:00.000Z', revokedAt: null },
];

async function setup(filled: 'empty' | 'allergies' | 'none-known' = 'empty') {
  const db = createMemoryDb();
  const members = createLocalMemberRepository(db);
  const member = await members.create({ familyId: newId(), fullName: 'Ana Souza', birthDate: '1959-03-01', relationship: 'parent', sex: 'female' });
  const cards = createLocalEmergencyCardRepository(db);
  if (filled === 'allergies') {
    await cards.upsert(member.id, member.familyId, emergencyCardFieldsSchema.parse({
      bloodType: 'A-',
      allergies: [{ name: 'Dipirona', reaction: 'urticária' }],
      contacts: [{ name: 'Marina', relation: 'irmã', phone: '(11) 99999-0000' }],
      notes: 'Usa marca-passo',
    }));
  }
  if (filled === 'none-known') {
    await cards.upsert(member.id, member.familyId, emergencyCardFieldsSchema.parse({ noKnownAllergies: true }));
  }
  await createLocalMedicationRepository(db).createMany([{
    familyId: member.familyId, memberId: member.id, name: 'Losartana', dosage: '50 mg', instructions: null,
    startOn: '2026-01-01', endOn: '2026-01-02', sourceRecordId: null, origin: 'manual',
  }]);
  const { wrapper: Deps } = renderWithDependencies({
    [DEPENDENCY_KEYS.auth]: { getCurrentUser: async () => ({ id: 'user-1', email: null, displayName: null, provider: 'email' }), onAuthStateChange: () => () => undefined },
    [DEPENDENCY_KEYS.members]: members,
    [DEPENDENCY_KEYS.medications]: createLocalMedicationRepository(db),
    [DEPENDENCY_KEYS.emergencyCards]: cards,
    [DEPENDENCY_KEYS.records]: { list: async () => [] },
    [DEPENDENCY_KEYS.consents]: { listMine: async () => v3 },
  });
  mockParams = { id: member.id, memberId: member.id };
  const wrapper = ({ children }: { children?: ReactNode }) => (
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
      <ThemeProvider scheme="light" reducedMotion>
        <Deps>{children}</Deps>
      </ThemeProvider>
    </SafeAreaProvider>
  );
  return { member, wrapper };
}

describe('Ficha de emergência', () => {
  beforeEach(() => {
    mockRouter.push.mockClear();
    openURL.mockClear();
    onlineManager.setOnline(true);
  });

  it('vazia oferece preencher e não inventa alergia', async () => {
    const { wrapper } = await setup('empty');
    await render(<EmergencyCardScreen demo />, { wrapper });
    expect(await screen.findByText('Ainda não há ficha de emergência de Ana.')).toBeOnTheScreen();
    expect(screen.getByText('Modo demonstração')).toBeOnTheScreen();
    expect(screen.queryByText('Dipirona')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Preencher ficha' }));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(main)/emergency/edit', params: { memberId: expect.any(String) } });
    expect(screen.getByText(/Informações declaradas pela família/)).toBeOnTheScreen();
  });

  it('leitura mostra alergia antes do tipo sanguíneo e não trata “sem alergias” como “não informadas”', async () => {
    const { wrapper } = await setup('allergies');
    await render(<EmergencyCardScreen />, { wrapper });
    expect(await screen.findByText('Dipirona')).toBeOnTheScreen();
    expect(screen.getByText('A−')).toBeOnTheScreen();
    expect(screen.queryByText('Alergias não informadas')).toBeNull();
    const texts = screen.getAllByText(/.+/).map((node) => String(node.props.children));
    expect(texts.indexOf('Dipirona')).toBeLessThan(texts.indexOf('A−'));
    expect(screen.getByText('11999990000')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /Ligar para Marina/ }));
    expect(openURL).toHaveBeenCalledWith('tel:11999990000');
    expect(screen.getByText(/Não substituem avaliação médica/)).toBeOnTheScreen();
  });

  it('sem conexão a ficha preenchida fica em modo leitura e não oferece editar', async () => {
    const { wrapper } = await setup('allergies');
    await render(<EmergencyCardScreen />, { wrapper });
    expect(await screen.findByRole('button', { name: 'Editar ficha' })).toBeOnTheScreen();
    await act(async () => {
      onlineManager.setOnline(false);
    });
    expect(await screen.findByText('Sem conexão: a ficha está em modo leitura.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Mostrar para o profissional' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Editar ficha' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Preencher ficha' })).toBeNull();
    expect(screen.getByText('Dipirona')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar para o profissional' }));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(main)/member/[id]/emergency-present', params: { id: expect.any(String) } });
    await act(async () => {
      onlineManager.setOnline(true);
    });
  });

  it('“Sem alergias conhecidas” não vira “Alergias não informadas”', async () => {
    const { wrapper } = await setup('none-known');
    await render(<EmergencyCardScreen />, { wrapper });
    expect(await screen.findByText('Sem alergias conhecidas')).toBeOnTheScreen();
    expect(screen.queryByText('Alergias não informadas')).toBeNull();
  });

});
