import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { renderWithTheme } from '../test-utils';
import { Checkbox } from './Checkbox';

const LABEL = 'Li e aceito os termos de uso';

function Harness({ disabled }: { disabled?: boolean }) {
  const [checked, setChecked] = useState(false);
  return <Checkbox checked={checked} onChange={setChecked} label={LABEL} disabled={disabled} />;
}

describe('Checkbox', () => {
  it('alterna ao tocar em qualquer parte da linha e anuncia o estado', async () => {
    await renderWithTheme(<Harness />);
    const box = screen.getByRole('checkbox', { name: new RegExp(LABEL) });
    expect(box).not.toBeChecked();
    await fireEvent.press(box);
    expect(screen.getByRole('checkbox', { name: new RegExp(LABEL) })).toBeChecked();
    await fireEvent.press(screen.getByRole('checkbox', { name: new RegExp(LABEL) }));
    expect(screen.getByRole('checkbox', { name: new RegExp(LABEL) })).not.toBeChecked();
  });

  it('desabilitado não muda', async () => {
    await renderWithTheme(<Harness disabled />);
    const box = screen.getByRole('checkbox', { name: new RegExp(LABEL) });
    expect(box).toBeDisabled();
    await fireEvent.press(box);
    expect(box).not.toBeChecked();
  });

  it('mostra a mensagem de erro', async () => {
    await renderWithTheme(<Checkbox checked={false} onChange={() => {}} label={LABEL} error="Para continuar, aceite os termos." />);
    expect(screen.getByText('Para continuar, aceite os termos.')).toBeTruthy();
  });
});
