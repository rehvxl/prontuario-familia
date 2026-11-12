import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/shared/ui';
import { FAB_ICON_ONLY_FONT_SCALE, FloatingActions, floatingFooterOf } from './FloatingActions';

type Mod = { $type: string; [k: string]: unknown };
type Node = { props?: Record<string, unknown>; children?: (Node | string)[] | null };
const walk = (n: unknown, out: Node[] = []): Node[] => {
  if (Array.isArray(n)) n.forEach((c) => walk(c, out));
  else if (n && typeof n === 'object') {
    out.push(n as Node);
    walk((n as Node).children, out);
  }
  return out;
};
const borderShape = () =>
  walk(screen.toJSON())
    .flatMap((n) => (Array.isArray(n.props?.modifiers) ? (n.props.modifiers as Mod[]) : []))
    .find((m) => m.$type === 'buttonBorderShape');

let mockFontScale = 1;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: mockFontScale }),
}));

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

const renderFab = (onPress = jest.fn()) =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ThemeProvider scheme="light" reducedMotion>
        <FloatingActions action={{ label: 'Novo registro', onPress, testID: 'fab' }} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );

const withFontScale = (fontScale: number) => {
  mockFontScale = fontScale;
};

describe('FloatingActions: botão "Novo registro" com Dynamic Type (BUG-08)', () => {
  it('tamanho normal: botão estendido (cápsula) com o rótulo visível', async () => {
    withFontScale(1);
    await renderFab();
    expect(JSON.stringify(borderShape())).toContain('capsule');
    expect(screen.getByRole('button', { name: 'Novo registro' })).toBeOnTheScreen();
  });

  it('a partir de AX1 vira só o ícone (círculo), sem estourar a borda, e o rótulo continua o nome acessível', async () => {
    withFontScale(FAB_ICON_ONLY_FONT_SCALE);
    const onPress = jest.fn();
    await renderFab(onPress);
    expect(JSON.stringify(borderShape())).toContain('circle');
    const button = screen.getByRole('button', { name: 'Novo registro' });
    await fireEvent(button, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('no maior tamanho (AX5, 3.12) também só o ícone', async () => {
    withFontScale(3.12);
    await renderFab();
    expect(JSON.stringify(borderShape())).toContain('circle');
  });
});

describe('FloatingActions: aviso offline sólido (v3)', () => {
  it('offline: "Sem conexão · mostrando o que já está salvo"; o modo demonstração não flutua mais (é o DemoBadge da tela)', async () => {
    withFontScale(1);
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ThemeProvider scheme="light" reducedMotion>
          <FloatingActions offline />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(screen.getByTestId('offline-banner')).toHaveTextContent('Sem conexão · mostrando o que já está salvo');
    expect(screen.queryByText('Modo demonstração')).toBeNull();
  });

  it('a camada deixa o toque passar para a lista fora do FAB e do aviso', async () => {
    withFontScale(1);
    await renderFab();
    const layer = walk(screen.toJSON()).find((n) => n.props?.pointerEvents === 'box-none');
    expect(layer).toBeDefined();
  });
});

describe('FloatingActions: régua de abas (v4)', () => {
  const layerStyle = () => walk(screen.toJSON()).find((n) => n.props?.pointerEvents === 'box-none')?.props?.style;
  const renderWithRail = () =>
    render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ThemeProvider scheme="light" reducedMotion>
          <FloatingActions rail action={{ label: 'Novo registro', onPress: () => {} }} />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

  it('com a régua na borda direita, o FAB para antes dela (40 da régua + 12)', async () => {
    withFontScale(1);
    await renderWithRail();
    expect(JSON.stringify(layerStyle())).toContain('"paddingRight":52');
  });

  it('com a régua em faixa no topo (≥ 1,35×), volta à margem da tela', async () => {
    withFontScale(1.35);
    await renderWithRail();
    expect(JSON.stringify(layerStyle())).toContain('"paddingRight":20');
  });
});

describe('floatingFooterOf: o que a camada ocupa, para o useFloatingFooterInset', () => {
  const action = { label: 'Novo registro', onPress: () => {} };
  it.each([
    [{ action }, { fab: true, pills: 0 }],
    [{ action, offline: true }, { fab: true, pills: 1 }],
    [{ offline: true, action: null }, { fab: false, pills: 1 }],
    [{}, { fab: false, pills: 0 }],
  ])('%j → %j', (props, expected) => {
    expect(floatingFooterOf(props)).toEqual(expected);
  });
});
