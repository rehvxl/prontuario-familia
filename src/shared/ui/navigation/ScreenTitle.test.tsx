import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { createTheme } from '../theme';
import { renderWithTheme } from '../test-utils';
import { screenTitleProps } from '../components/screenTitleProps';
import { LargeTitle, ScreenTitle } from '.';

const captured: Record<string, unknown>[] = [];
jest.mock('expo-router', () => ({
  Stack: {
    Title: (props: Record<string, unknown>) => {
      captured.push(props);
      return null;
    },
  },
}));

beforeEach(() => {
  captured.length = 0;
});

describe('ScreenTitle / LargeTitle (Stack.Title com as cores do DS)', () => {
  it('aplica a cor de texto do sistema no título e no título grande, não o tint', async () => {
    const theme = createTheme('light');
    await renderWithTheme(<LargeTitle>Família Silva</LargeTitle>);
    const props = captured.at(-1)!;
    expect(props.large).toBe(true);
    expect(props.children).toBe('Família Silva');
    expect(props.style).toEqual({ color: theme.native.label });
    expect(props.largeStyle).toEqual({ color: theme.native.label });
    expect((props.largeStyle as { color: unknown }).color).not.toBe(theme.colors.primary);
  });

  it('segue o tema escuro', async () => {
    await renderWithTheme(<ScreenTitle>Buscar</ScreenTitle>, 'dark');
    expect((captured.at(-1)!.style as { color: unknown }).color).toBe(createTheme('dark').native.label);
  });

  it('estilo do chamador vence (fonte e cor intencional)', () => {
    const theme = createTheme('light');
    const props = screenTitleProps(theme, { children: 'X', style: { fontFamily: 'Serif' }, largeStyle: [{ color: 'red' }] });
    expect(props.style).toEqual({ color: theme.native.label, fontFamily: 'Serif' });
    expect(props.largeStyle).toEqual({ color: 'red' });
  });

  it('asChild repassa o componente', async () => {
    await renderWithTheme(
      <ScreenTitle asChild>
        <Text>Custom</Text>
      </ScreenTitle>,
    );
    expect(captured.at(-1)!.asChild).toBe(true);
    expect(screen.queryByText('Custom')).toBeNull(); // quem desenha é o cabeçalho nativo
  });
});
