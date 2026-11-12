import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { MemberRepository } from '@/entities/member';
import { createLocalMemberRepository } from '@/entities/member';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { ThemeProvider } from '@/shared/ui';
import { EditMemberScreen } from './EditMemberScreen';

const mockRouter = { back: jest.fn(), dismissTo: jest.fn() };
let mockId = 'm1';
jest.mock('expo-router', () => {
  /* eslint-disable @typescript-eslint/no-require-imports -- fábrica de jest.mock não pode usar imports de topo */
  const React = require('react');
  const { Pressable } = require('react-native');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const Toolbar = Object.assign(({ children }: { children?: unknown }) => React.createElement(React.Fragment, null, children), {
    Menu: ({ accessibilityLabel, children }: { accessibilityLabel: string; children?: unknown }) =>
      React.createElement(React.Fragment, null, React.createElement(Pressable, { accessibilityRole: 'button', accessibilityLabel }), children),
    MenuAction: ({ children, onPress }: { children: string; onPress: () => void }) =>
      React.createElement(Pressable, { accessibilityRole: 'button', accessibilityLabel: children, onPress }),
  });
  return { Stack: { Toolbar, Screen: () => null }, useRouter: () => mockRouter, useLocalSearchParams: () => ({ id: mockId }) };
});

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

async function show(members: MemberRepository) {
  const { wrapper: Deps } = renderWithDependencies({ members });
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ThemeProvider scheme="light" reducedMotion>
        <Deps>
          <EditMemberScreen />
        </Deps>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('EditMemberScreen', () => {
  it('carrega a pessoa no formulário, com a dica da data de nascimento e o menu "Mais ações" nomeado', async () => {
    const members = createLocalMemberRepository(createMemoryDb());
    const lia = await members.create({ familyId: 'f1', fullName: 'Lia Souza', birthDate: '2026-01-10', relationship: 'child', sex: 'female' });
    mockId = lia.id;
    await show(members);
    expect(await screen.findByDisplayValue('Lia Souza')).toBeOnTheScreen();
    expect(screen.getByText('Usada para o calendário de vacinas')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Mais ações' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Remover pessoa' })).toBeOnTheScreen();
  });

  it('pessoa inexistente: "Pessoa não encontrada" com "Voltar"', async () => {
    mockId = 'nao-existe';
    await show(createLocalMemberRepository(createMemoryDb()));
    expect(await screen.findByText('Pessoa não encontrada')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('falha ao carregar: erro com "Tentar de novo", sem dizer que a pessoa sumiu', async () => {
    mockId = 'm1';
    const failing = { ...createLocalMemberRepository(createMemoryDb()), getById: async () => Promise.reject(new Error('rede')) };
    await show(failing);
    expect(await screen.findByText('Não foi possível carregar')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
    expect(screen.queryByText('Pessoa não encontrada')).toBeNull();
  });
});
