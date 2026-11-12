import { fireEvent, render, screen } from '@testing-library/react-native';
import { RAIL_TAB_ROLE , DividerBoard, Leaf, ThemeProvider, Text, useTheme } from '@/shared/ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Member } from '@/entities/member';
import { FAMILY_TAB_ID, useFamilyTabRail } from './FamilyTabRail';

const mockMembers = jest.fn();
const mockCounts = jest.fn();
jest.mock('@/entities/member', () => ({ useMembers: () => mockMembers() }));
jest.mock('@/entities/health-record', () => ({ useRecordCounts: () => mockCounts() }));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
}));

const person = (id: string, fullName: string) => ({ id, fullName }) as Member;
const MEMBERS = [person('ana', 'Ana Souza'), person('carlos', 'Carlos Souza'), person('lia', 'Lia Souza')];

function Probe({ current, onNavigate }: { current: string; onNavigate: (id: string) => void }) {
  const theme = useTheme();
  const tabs = useFamilyTabRail({ familyId: 'f1', current, onNavigate });
  return (
    <DividerBoard hue={tabs.hue} rail={tabs.rail} testID="board">
      <Leaf>
        <Text testID="hue">{`${tabs.hue.name}|${theme.hue.name}`}</Text>
      </Leaf>
    </DividerBoard>
  );
}

const renderRail = async (props: { current?: string; reduced?: boolean; onNavigate?: jest.Mock } = {}) => {
  const onNavigate = props.onNavigate ?? jest.fn();
  const ui = (current: string) => (
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
      <ThemeProvider scheme="light" reducedMotion={props.reduced ?? false}>
        <Probe current={current} onNavigate={onNavigate} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
  const view = await render(ui(props.current ?? FAMILY_TAB_ID));
  return { onNavigate, rerender: async (current: string) => view.rerender(ui(current)) };
};

const boardColor = () => screen.getByTestId('board').props.style.find((s: { backgroundColor?: string }) => s?.backgroundColor).backgroundColor;

beforeEach(() => {
  jest.useFakeTimers();
  mockMembers.mockReturnValue({ data: MEMBERS });
  mockCounts.mockReturnValue({ data: { carlos: 6, lia: 4 } });
});
afterEach(() => jest.useRealTimers());

describe('useFamilyTabRail', () => {
  it('Família + uma aba por pessoa na ordem de cadastro, com o primeiro nome escrito e a contagem', async () => {
    await renderRail();
    const tabs = screen.getAllByRole(RAIL_TAB_ROLE);
    expect(tabs.map((t) => t.props.accessibilityLabel)).toEqual(['Família', 'Ana Souza, 0 documentos', 'Carlos Souza, 6 documentos', 'Lia Souza, 4 documentos']);
    expect(screen.getByRole(RAIL_TAB_ROLE, { name: 'Família' })).toBeSelected();
    expect(screen.getByText('Carlos')).toBeOnTheScreen();
    expect(screen.getByText('6')).toBeOnTheScreen();
  });

  it('sem contagens ainda: aba sem número; sem pessoas: sem régua', async () => {
    mockCounts.mockReturnValue({ data: undefined });
    await renderRail();
    expect(screen.getByRole(RAIL_TAB_ROLE, { name: 'Carlos Souza' })).toBeOnTheScreen();
    mockMembers.mockReturnValue({ data: [] });
    await renderRail();
    expect(screen.queryByTestId('family-tab-rail')).toBeNull();
  });

  it('troca no toque: avisa a tela na hora, e capa e aba mudam juntas quando a tela troca (nenhum quadro misto)', async () => {
    const { onNavigate, rerender } = await renderRail();
    const ultramar = boardColor();
    await fireEvent.press(screen.getByRole(RAIL_TAB_ROLE, { name: 'Carlos Souza, 6 documentos' }));
    expect(onNavigate).toHaveBeenCalledWith('carlos');
    // Sem a tela trocar, nada muda (a régua não marca sozinha uma aba que a tela não mostra).
    expect(boardColor()).toBe(ultramar);
    expect(screen.getByRole(RAIL_TAB_ROLE, { name: 'Família' })).toBeSelected();

    await rerender('carlos');
    expect(boardColor()).not.toBe(ultramar);
    expect(screen.getByRole(RAIL_TAB_ROLE, { name: 'Carlos Souza, 6 documentos' })).toBeSelected();
  });

  it('com Reduzir movimento, navega na hora', async () => {
    const { onNavigate } = await renderRail({ reduced: true });
    await fireEvent.press(screen.getByRole(RAIL_TAB_ROLE, { name: 'Lia Souza, 4 documentos' }));
    expect(onNavigate).toHaveBeenCalledWith('lia');
  });

  it('na tela da pessoa: a aba dela vem marcada e na cor dela; tocar a aba atual não faz nada', async () => {
    const { onNavigate, rerender } = await renderRail({ current: 'carlos', reduced: true });
    expect(screen.getByRole(RAIL_TAB_ROLE, { name: 'Carlos Souza, 6 documentos' })).toBeSelected();
    await fireEvent.press(screen.getByRole(RAIL_TAB_ROLE, { name: 'Carlos Souza, 6 documentos' }));
    expect(onNavigate).not.toHaveBeenCalled();

    // Outra pessoa por parâmetro (setParams): a marca segue a tela.
    await fireEvent.press(screen.getByRole(RAIL_TAB_ROLE, { name: 'Lia Souza, 4 documentos' }));
    await rerender('lia');
    expect(screen.getByRole(RAIL_TAB_ROLE, { name: 'Lia Souza, 4 documentos' })).toBeSelected();
  });
});
