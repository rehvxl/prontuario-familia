import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithTheme } from '../test-utils';
import { contrastRatio } from '../tokens/contrast';
import { darkColors, lightColors } from '../tokens/colors';
import { Button } from './Button';
import { prominentForeground } from './Button.types';
import { FloatingActionButton } from './FloatingActionButton';
import { Select } from './Select';

type Mod = { $type: string; [k: string]: unknown };
/** Todos os modificadores SwiftUI passados na árvore renderizada. */
type Node = { props?: Record<string, unknown>; children?: (Node | string)[] | null };
const walk = (n: unknown, out: Node[] = []): Node[] => {
  if (Array.isArray(n)) n.forEach((c) => walk(c, out));
  else if (n && typeof n === 'object') {
    out.push(n as Node);
    walk((n as Node).children, out);
  }
  return out;
};
const nodes = () => walk(screen.toJSON());
const modifiers = (): Mod[] => nodes().flatMap((n) => (Array.isArray(n.props?.modifiers) ? (n.props.modifiers as Mod[]) : []));
const foreground = () => modifiers().filter((m) => m.$type === 'foregroundStyle');

/**
 * Cor que o iOS 26 realmente pinta no FAB `glassProminent` tingido com o `primary` escuro (#6E9EFF):
 * o vidro clareia o tint. Medido por pixel em docs/qa/screenshots/dark-02-home.png (BUG-05).
 */
const DARK_GLASS_PROMINENT_RENDERED = '#7BAEFF';

describe('BUG-05: rótulo de botão proeminente (SwiftUI) com contraste AA', () => {
  it('o branco padrão do SwiftUI não passa sobre o azul do escuro (por isso o teste de tokens não pegava)', () => {
    // O teste de tokens confere onPrimary × primary. O SwiftUI ignorava onPrimary e pintava branco.
    expect(contrastRatio('#FFFFFF', DARK_GLASS_PROMINENT_RENDERED)).toBeLessThan(4.5);
    expect(contrastRatio('#FFFFFF', darkColors.primary)).toBeLessThan(4.5);
  });

  it.each([
    ['claro', lightColors],
    ['escuro', darkColors],
  ] as const)('prominentForeground ≥ 4,5:1 sobre o tint e sobre o vidro renderizado (%s)', (_n, colors) => {
    expect(contrastRatio(prominentForeground(colors), colors.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(prominentForeground(colors, 'destructive'), colors.danger)).toBeGreaterThanOrEqual(4.5);
  });

  it('no escuro, o rótulo escolhido passa sobre a cor medida do vidro', () => {
    expect(contrastRatio(prominentForeground(darkColors), DARK_GLASS_PROMINENT_RENDERED)).toBeGreaterThanOrEqual(4.5);
  });

  it('o FAB aplica foregroundStyle(onPrimary) no rótulo', async () => {
    await renderWithTheme(<FloatingActionButton extended icon="add" label="Novo registro" onPress={() => {}} />, 'dark');
    expect(foreground()).toEqual([expect.objectContaining({ $type: 'foregroundStyle' })]);
    expect(JSON.stringify(foreground()[0])).toContain(darkColors.onPrimary);
  });

  it('Button filled/glassProminent aplica o token "on"; bordered/plain não', async () => {
    await renderWithTheme(
      <>
        <Button label="Salvar" variant="glassProminent" onPress={() => {}} />
        <Button label="Excluir" variant="destructive" onPress={() => {}} />
        <Button label="Cancelar" variant="bordered" onPress={() => {}} />
        <Button label="Depois" variant="plain" onPress={() => {}} />
      </>,
      'dark',
    );
    const fg = foreground().map((m) => JSON.stringify(m));
    expect(fg).toHaveLength(2);
    expect(fg[0]).toContain(darkColors.onPrimary);
    expect(fg[1]).toContain(darkColors.onDanger);
  });
});

describe('BUG-04: Select (iOS) com nome e valor para o VoiceOver', () => {
  it('o Menu nativo recebe rótulo, valor e dica', async () => {
    await renderWithTheme(
      <Select
        label="Parentesco"
        options={[{ value: 'child', label: 'Filho(a)' }, { value: 'self', label: 'Eu' }]}
        value="child"
        onChange={() => {}}
        testID="sel"
      />,
    );
    await fireEvent(screen.getByTestId('sel-frame'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 353, height: 52 } } });
    const a11y = Object.fromEntries(modifiers().filter((m) => m.$type.startsWith('accessibility')).map((m) => [m.$type, m]));
    expect(a11y.accessibilityLabel).toMatchObject({ label: 'Parentesco' });
    expect(a11y.accessibilityValue).toMatchObject({ value: 'Filho(a)' });
    expect(a11y.accessibilityHint).toMatchObject({ hint: 'Abre a lista de opções' });
  });

  it('sem valor e opcional: anuncia "opcional" e "nenhum selecionado"', async () => {
    await renderWithTheme(
      <Select label="Sexo" optional options={[{ value: 'f', label: 'Feminino' }]} value={null} onChange={() => {}} testID="sel" />,
    );
    await fireEvent(screen.getByTestId('sel-frame'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 353, height: 52 } } });
    const a11y = Object.fromEntries(modifiers().filter((m) => m.$type.startsWith('accessibility')).map((m) => [m.$type, m]));
    expect(a11y.accessibilityLabel).toMatchObject({ label: 'Sexo, opcional' });
    expect(a11y.accessibilityValue).toMatchObject({ value: 'nenhum selecionado' });
  });

  it('escolher uma opção chama onChange', async () => {
    const onChange = jest.fn();
    await renderWithTheme(
      <Select label="Parentesco" options={[{ value: 'child', label: 'Filho(a)' }, { value: 'self', label: 'Eu' }]} value="child" onChange={onChange} testID="sel" />,
    );
    await fireEvent(screen.getByTestId('sel-frame'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 353, height: 52 } } });
    const toggle = nodes().find((n) => n.props?.label === 'Eu' && typeof n.props?.onIsOnChange === 'function');
    await (toggle!.props!.onIsOnChange as (e: unknown) => void)({ nativeEvent: { isOn: true } });
    expect(onChange).toHaveBeenCalledWith('self');
  });
});
