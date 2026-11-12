import { renderHook, screen } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { sheetScreenOptions } from '../navigation/sheetOptions';
import { ThemeProvider, createTheme } from '../theme';
import { renderWithTheme } from '../test-utils';
import { typography } from '../tokens';
import { DemoBadge } from './Badge';
import { Banner } from './Banner';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { FLOATING_ACTION_HEIGHT, Screen, ScrollEdgeVeil, useFloatingFooterInset } from './Screen';
import { SuggestedField, quoteEvidence } from './SuggestedField';
import { Text } from './Text';

// Validação do Tech Lead em aparelho (iPhone 17 Pro / iOS 26.5 e Android 16), defeitos A1–A9 da fatia de DS.

type Node = { type: string; props: Record<string, unknown> & { style?: unknown; testID?: string }; children?: (Node | string)[] | null };
const flat = (style: unknown) => (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;
const metrics = (top: number, bottom: number) => ({ frame: { x: 0, y: 0, width: 402, height: 874 }, insets: { top, left: 0, right: 0, bottom } });
const renderInScreen = (ui: ReactElement, top = 62, bottom = 34) =>
  renderWithTheme(<SafeAreaProvider initialMetrics={metrics(top, bottom)}>{ui}</SafeAreaProvider>);
const providerChildren = () => ((screen.toJSON() as unknown as Node).children ?? []) as Node[];
const theme = createTheme('light');

describe('A1: véu na altura da barra de status', () => {
  it('ScrollEdgeVeil: fundo do tema na altura do inset + fade, sem toque nem foco', async () => {
    await renderInScreen(<ScrollEdgeVeil />, 62);
    const veil = screen.getByTestId('scroll-edge-veil', { includeHiddenElements: true });
    const style = flat(veil.props.style);
    expect(style).toMatchObject({ position: 'absolute', top: 0, left: 0, right: 0, height: 62 + theme.space[3] });
    expect(style.backgroundImage).toBe(`linear-gradient(to bottom, ${theme.colors.background} 84%, ${theme.colors.background}00 100%)`);
    expect(veil.props.pointerEvents).toBe('none');
    expect(veil.props.accessibilityElementsHidden).toBe(true);
  });

  it('sem inset superior (ex.: paisagem sem entalhe) não desenha nada', async () => {
    await renderInScreen(<ScrollEdgeVeil />, 0);
    expect(screen.queryByTestId('scroll-edge-veil', { includeHiddenElements: true })).toBeNull();
  });

  it('tela-raiz com heading (iOS, cabeçalho transparente): véu depois do ScrollView, que segue primeiro filho', async () => {
    await renderInScreen(
      <Screen heading={{ title: 'Família Souza' }} testID="home">
        <Text>Pessoas</Text>
      </Screen>,
    );
    const [first, second] = providerChildren();
    expect(first!.type).toBe('RCTScrollView');
    expect(first!.props.testID).toBe('home');
    expect(second!.props.testID).toBe('scroll-edge-veil');
  });

  it('sem cabeçalho (edges com top) também tem véu', async () => {
    await renderInScreen(
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <Text>Boas-vindas</Text>
      </Screen>,
    );
    expect(screen.getByTestId('scroll-edge-veil', { includeHiddenElements: true })).toBeTruthy();
  });

  it('folha nativa nunca tem véu, mesmo com heading', async () => {
    await renderInScreen(
      <Screen presentation="sheet" heading={{ title: 'Novo sinal vital' }}>
        <Text>Campo</Text>
      </Screen>,
    );
    expect(screen.queryByTestId('scroll-edge-veil', { includeHiddenElements: true })).toBeNull();
  });

  it('veil={false} desliga (heading sob cabeçalho opaco)', async () => {
    await renderInScreen(
      <Screen heading={{ title: 'Ajustes' }} veil={false}>
        <Text>Conta</Text>
      </Screen>,
    );
    expect(screen.queryByTestId('scroll-edge-veil', { includeHiddenElements: true })).toBeNull();
  });

  it('tela empilhada sem heading continua sem véu (o cabeçalho com título já tem o efeito de borda do sistema)', async () => {
    await renderInScreen(
      <Screen>
        <Text>Detalhe</Text>
      </Screen>,
    );
    expect(screen.queryByTestId('scroll-edge-veil', { includeHiddenElements: true })).toBeNull();
  });
});

describe('A2: título serifado logo abaixo do cabeçalho', () => {
  it('com heading, o conteúdo começa a 8 pt do topo ajustado', async () => {
    await renderInScreen(
      <Screen heading={{ title: 'Família Souza', subtitle: 'Quarta-feira, 11 de novembro de 2026' }} testID="home">
        <Text>Pessoas</Text>
      </Screen>,
    );
    expect(flat(screen.getByTestId('home').props.contentContainerStyle).paddingTop).toBe(theme.space[2]);
  });

  it('sem heading, mantém os 16 pt', async () => {
    await renderInScreen(
      <Screen testID="detalhe">
        <Text>Detalhe</Text>
      </Screen>,
    );
    expect(flat(screen.getByTestId('detalhe').props.contentContainerStyle).paddingTop).toBe(theme.space[4]);
  });
});

describe('A3: rodapé flutuante e aviso de demonstração', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SafeAreaProvider initialMetrics={metrics(62, 34)}>
      <ThemeProvider scheme="light">{children}</ThemeProvider>
    </SafeAreaProvider>
  );

  it('useFloatingFooterInset soma safe area (com a barra de abas), FAB, pílulas e folga', async () => {
    const fab = await renderHook(() => useFloatingFooterInset(), { wrapper });
    expect(fab.result.current).toBe(34 + 12 + FLOATING_ACTION_HEIGHT + 16);
    const offline = await renderHook(() => useFloatingFooterInset({ pills: 1 }), { wrapper });
    expect(offline.result.current).toBe(34 + 12 + FLOATING_ACTION_HEIGHT + 12 + 44 + 16);
    const none = await renderHook(() => useFloatingFooterInset({ fab: false }), { wrapper });
    expect(none.result.current).toBe(0);
  });

  it('Banner floating: a faixa de largura total deixa o toque passar para a lista', async () => {
    await renderWithTheme(<Banner appearance="floating" message="Sem conexão · mostrando o que já está salvo" testID="offline" />);
    expect(screen.getByTestId('offline').props.pointerEvents).toBe('box-none');
  });

  it('DemoBadge: cápsula inline "Modo demonstração" no tom care (careSoft), para ficar abaixo do título', async () => {
    await renderWithTheme(<DemoBadge />);
    const badge = screen.getByTestId('demo-badge');
    expect(badge).toHaveTextContent('Modo demonstração');
    expect(flat(badge.props.style).backgroundColor).toBe(theme.colors.primarySoft);
    expect(flat(badge.props.style).position).toBeUndefined();
  });
});

describe('A4 (v4): títulos com um peso que o arquivo tem', () => {
  it('títulos em Bold (700), que existe como arquivo nas duas plataformas (ArchivoSC-Bold)', () => {
    for (const v of ['largeTitle', 'title1', 'title2', 'title3'] as const) expect(typography[v].fontWeight).toBe('700');
  });
});

describe('A5: botão plain no Android usa a cor de cuidado', () => {
  // O jest roda como iOS; carrega a implementação Material (Button.tsx) explicitamente.
  const { Button: MaterialButton } = jest.requireActual<{ Button: typeof Button }>('./Button.tsx');

  it('rótulo do "Pular"/"Ver tudo" em primary (care), não no texto principal', async () => {
    await renderWithTheme(<MaterialButton label="Pular" variant="plain" />);
    expect(flat(screen.getByText('Pular').props.style).color).toBe(theme.colors.primary);
  });

  it('filled continua com onPrimary; destrutivo plain em danger', async () => {
    await renderWithTheme(
      <>
        <MaterialButton label="Salvar" />
        <MaterialButton label="Excluir" variant="plain" role="destructive" />
      </>,
    );
    expect(flat(screen.getByText('Salvar').props.style).color).toBe(theme.colors.onPrimary);
    expect(flat(screen.getByText('Excluir').props.style).color).toBe(theme.colors.danger);
  });
});

describe('A6: folha com rolagem e rodapé fora da correção de frame do react-native-screens', () => {
  it('raiz real sem cor/testID, primeiro filho vazio e não achatável, depois ScrollView e rodapé não achatável', async () => {
    await renderInScreen(
      <Screen presentation="sheet" footer={<Text>Salvar registro</Text>} testID="folha">
        <Text>Campo</Text>
      </Screen>,
    );
    const root = providerChildren()[0]!;
    expect(root.props.collapsable).toBe(false);
    expect(flat(root.props.style).backgroundColor).toBeUndefined();
    expect(root.props.testID).toBeUndefined();
    const [guard, scroll, footer] = root.children as Node[];
    expect(guard!.type).toBe('View');
    expect(guard!.props.collapsable).toBe(false);
    expect(guard!.children ?? []).toHaveLength(0);
    expect(scroll!.type).toBe('RCTScrollView');
    expect(scroll!.props.testID).toBe('folha');
    expect(footer!.props.collapsable).toBe(false);
    expect(root.children).toHaveLength(3);
  });

  it('folha só com rolagem (sem rodapé) mantém o ScrollView como raiz, como na v0.1.8', async () => {
    await renderInScreen(
      <Screen presentation="sheet" testID="folha">
        <Text>Campo</Text>
      </Screen>,
    );
    const [root, ...rest] = providerChildren();
    expect(root!.type).toBe('RCTScrollView');
    expect(rest).toHaveLength(0);
  });
});

describe('A7: rotas de formulário por plataforma', () => {
  it('iOS: formSheet com detents e alça; Android: modal com cabeçalho', () => {
    expect(sheetScreenOptions('ios')).toEqual({ presentation: 'formSheet', sheetAllowedDetents: [0.8, 1], sheetGrabberVisible: true, headerTransparent: false });
    expect(sheetScreenOptions('android')).toEqual({ presentation: 'modal', headerShown: true });
  });
});

describe('A8: papéis e estados estáveis para VoiceOver', () => {
  it('Button (SwiftUI) mantém role button quando o rótulo muda', async () => {
    const { rerender } = await renderWithTheme(<Button label="Salvar registro" fullWidth />);
    expect(screen.getByRole('button', { name: 'Salvar registro' }).props.role).toBe('button');
    await rerender(
      <ThemeProvider scheme="light" reducedMotion>
        <Button label="Salvar registro e 2 itens" fullWidth />
      </ThemeProvider>,
    );
    const btn = screen.getByRole('button', { name: 'Salvar registro e 2 itens' });
    expect(btn.props.role).toBe('button');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('Checkbox desmarcado expõe checked: false (nunca sem estado)', async () => {
    await renderWithTheme(<Checkbox checked={undefined as unknown as boolean} onChange={() => {}} label="Hemoglobina" testID="item" />);
    expect(screen.getByTestId('item').props.accessibilityState).toEqual({ checked: false, disabled: false });
    expect(screen.getByRole('checkbox', { name: 'Hemoglobina' })).not.toBeChecked();
  });
});

describe('A9: trecho lido em rodapé normal, entre aspas', () => {
  it('footnote textSecondary com aspas tipográficas e sem monoespaçada', async () => {
    await renderWithTheme(
      <SuggestedField label="Profissional" value="Dra. Paula Lima" onChange={() => {}} origin="ocr" confidence="high" sourceHint="Dra. Paula Lima CRM 12345" testID="prof" />,
    );
    const evidence = screen.getByTestId('prof-evidence');
    expect(evidence).toHaveTextContent('“Dra. Paula Lima CRM 12345”');
    const style = flat(evidence.props.style);
    expect(style.color).toBe(theme.colors.textSecondary);
    expect(style.fontSize).toBe(theme.typography.footnote.fontSize);
    expect(String(style.fontFamily)).not.toMatch(/mono/i);
  });

  it('quoteEvidence apara espaços', () => {
    expect(quoteEvidence('  Coletado em 03/11/2026 ')).toBe('“Coletado em 03/11/2026”');
  });
});
