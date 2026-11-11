import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { renderWithTheme } from '../test-utils';
import { ChipGroup, type ChipGroupOption } from './Chip';

type Kind = 'exam' | 'vaccine' | 'prescription';
const OPTIONS: ChipGroupOption<Kind>[] = [
  { value: 'exam', label: 'Exames', colorIndex: 1 },
  { value: 'vaccine', label: 'Vacinas', colorIndex: 4 },
  { value: 'prescription', label: 'Receitas', colorIndex: 3 },
];

function Harness({ multiple, onChange }: { multiple?: boolean; onChange?: (v: Kind[]) => void }) {
  const [value, setValue] = useState<Kind[]>([]);
  return (
    <ChipGroup
      options={OPTIONS}
      value={value}
      multiple={multiple}
      allLabel="Todos"
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

const chip = (name: string) => screen.getByRole('button', { name });

describe('ChipGroup', () => {
  it('começa com "Todos" selecionado', async () => {
    await renderWithTheme(<Harness />);
    expect(chip('Todos')).toBeSelected();
    expect(chip('Exames')).not.toBeSelected();
  });

  it('seleção múltipla liga e desliga cada chip', async () => {
    const onChange = jest.fn();
    await renderWithTheme(<Harness onChange={onChange} />);
    await fireEvent.press(chip('Exames'));
    await fireEvent.press(chip('Vacinas'));
    expect(onChange).toHaveBeenLastCalledWith(['exam', 'vaccine']);
    expect(chip('Exames')).toBeSelected();
    expect(chip('Vacinas')).toBeSelected();
    expect(chip('Todos')).not.toBeSelected();
    await fireEvent.press(chip('Exames'));
    expect(onChange).toHaveBeenLastCalledWith(['vaccine']);
  });

  it('"Todos" limpa os filtros', async () => {
    const onChange = jest.fn();
    await renderWithTheme(<Harness onChange={onChange} />);
    await fireEvent.press(chip('Receitas'));
    await fireEvent.press(chip('Todos'));
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(chip('Todos')).toBeSelected();
  });

  it('seleção única troca o selecionado', async () => {
    const onChange = jest.fn();
    await renderWithTheme(<Harness multiple={false} onChange={onChange} />);
    await fireEvent.press(chip('Exames'));
    await fireEvent.press(chip('Vacinas'));
    expect(onChange).toHaveBeenLastCalledWith(['vaccine']);
    expect(chip('Exames')).not.toBeSelected();
  });
});
