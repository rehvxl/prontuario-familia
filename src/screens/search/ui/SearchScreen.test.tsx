import { AccessibilityInfo, StyleSheet } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DEPENDENCY_KEYS } from '@/shared/lib';
import { createMemoryDb, renderWithDependencies } from '@/shared/lib/testing';
import { createLocalHealthRecordRepository } from '@/entities/health-record';
import { createLocalMemberRepository } from '@/entities/member';
import { ThemeProvider, lightTheme } from '@/shared/ui';
import { SearchScreen } from './SearchScreen';

const mockRouter = { push: jest.fn() };
const mockClearText = jest.fn();
jest.mock('expo-router', () => {
  /* eslint-disable @typescript-eslint/no-require-imports -- fábrica de jest.mock não pode usar imports de topo */
  const React = require('react');
  const { TextInput } = require('react-native');
  /* eslint-enable @typescript-eslint/no-require-imports */
  // A barra de busca nativa vira um TextInput; o `ref` expõe `clearText` como os comandos do react-native-screens.
  const SearchBar = ({ ref, onChangeText }: { ref?: { current: unknown }; onChangeText: (e: { nativeEvent: { text: string } }) => void }) => {
    const [value, setValue] = React.useState('');
    if (ref) ref.current = { clearText: () => (mockClearText(), setValue('')) };
    return React.createElement(TextInput, {
      testID: 'search-input',
      value,
      onChangeText: (text: string) => {
        setValue(text);
        onChangeText({ nativeEvent: { text } });
      },
    });
  };
  return { Stack: { Screen: () => null, SearchBar }, useRouter: () => mockRouter, useFocusEffect: () => undefined };
});

const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});

async function setup() {
  const db = createMemoryDb();
  const members = createLocalMemberRepository(db);
  const records = createLocalHealthRecordRepository(db);
  const ana = await members.create({ familyId: 'f1', fullName: 'Ana Souza', birthDate: '1988-05-01', relationship: 'self', sex: 'female' });
  const carlos = await members.create({ familyId: 'f1', fullName: 'Carlos Souza', birthDate: '1959-08-01', relationship: 'spouse', sex: 'male' });
  const doc = (memberId: string, title: string, date: string) =>
    records.create({ familyId: 'f1', memberId, type: 'result', title, date, location: 'Laboratório Santa Clara', professional: null, notes: null });
  const hemoAna = await doc(ana.id, 'Hemograma completo', '2026-03-10');
  await doc(carlos.id, 'Hemoglobina glicada', '2026-10-12');
  await doc(carlos.id, 'Consulta cardiologista', '2026-02-02');
  const { wrapper: Deps } = renderWithDependencies({
    [DEPENDENCY_KEYS.families]: { getMyFamily: async () => ({ id: 'f1', name: 'Souza', createdAt: 'c', myRole: 'owner' }) },
    [DEPENDENCY_KEYS.members]: members,
    [DEPENDENCY_KEYS.records]: records,
  });
  await render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
      <ThemeProvider scheme="light" reducedMotion>
        <Deps>
          <SearchScreen />
        </Deps>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  return { hemoAna };
}

beforeEach(() => jest.clearAllMocks());

describe('SearchScreen (v3)', () => {
  it('título "Buscar"; agrupa os resultados por pessoa, mostra e anuncia o total, e abre o registro', async () => {
    const { hemoAna } = await setup();
    expect(screen.getByRole('header', { name: 'Buscar' })).toBeOnTheScreen();
    // v4: na capa da família (ultramar), numa folha sem furos.
    const paints = (color: string) => StyleSheet.flatten(screen.getByTestId('screen-board', { includeHiddenElements: true }).props.style).backgroundColor === color;
    expect(paints(lightTheme.hues.family.board)).toBe(true);
    expect(screen.queryAllByTestId('leaf-hole', { includeHiddenElements: true })).toHaveLength(0);
    expect(screen.getByText('Busque no histórico da família')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('search-input'), 'hemo');

    expect(await screen.findByText('2 resultados')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Ana Souza' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Carlos Souza' })).toBeOnTheScreen();
    expect(screen.queryByText('Consulta cardiologista')).toBeNull();
    await waitFor(() => expect(announce).toHaveBeenLastCalledWith('2 resultados'));

    await fireEvent.press(screen.getByText('Hemograma completo'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(main)/record/[id]', params: { id: hemoAna.id } });
  });

  it('sem resultado: "Nada encontrado" com o termo e "Limpar busca" volta ao início', async () => {
    await setup();
    await fireEvent.changeText(screen.getByTestId('search-input'), 'ferritina');
    expect(await screen.findByText('Nada encontrado')).toBeOnTheScreen();
    expect(screen.getByText('Nenhum registro com "ferritina". Confira a escrita ou tente outro termo ou tipo.')).toBeOnTheScreen();

    await fireEvent(screen.getByRole('button', { name: 'Limpar busca' }), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(mockClearText).toHaveBeenCalled();
    expect(await screen.findByText('Busque no histórico da família')).toBeOnTheScreen();
  });

  it('o filtro de tipo sozinho já busca', async () => {
    await setup();
    await fireEvent.press(screen.getByRole('button', { name: 'Resultado' }));
    expect(await screen.findByText('3 resultados')).toBeOnTheScreen();
  });
});
