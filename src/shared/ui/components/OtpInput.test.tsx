import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { renderWithTheme } from '../test-utils';
import { OtpInput, sanitizeOtp } from './OtpInput';

function Harness({ onComplete }: { onComplete: (code: string) => void }) {
  const [value, setValue] = useState('');
  return <OtpInput value={value} onChange={setValue} onComplete={onComplete} testID="otp" />;
}

describe('sanitizeOtp', () => {
  it('mantém só dígitos e corta no tamanho', () => {
    expect(sanitizeOtp('12 34-56', 6)).toBe('123456');
    expect(sanitizeOtp('Seu código é 987654. Não compartilhe.', 6)).toBe('987654');
    expect(sanitizeOtp('1234567890', 6)).toBe('123456');
  });
});

describe('OtpInput', () => {
  it('configura autopreenchimento de código do sistema', async () => {
    await renderWithTheme(<Harness onComplete={() => {}} />);
    const input = screen.getByTestId('otp');
    expect(input.props.textContentType).toBe('oneTimeCode');
    expect(input.props.keyboardType).toBe('number-pad');
    expect(input.props.accessibilityLabel).toBe('Código de verificação, 6 dígitos');
  });

  it('aceita colar o código com espaços e chama onComplete uma vez', async () => {
    const onComplete = jest.fn();
    await renderWithTheme(<Harness onComplete={onComplete} />);
    await fireEvent.changeText(screen.getByTestId('otp'), '123 456');
    expect(onComplete).toHaveBeenCalledWith('123456');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('otp').props.value).toBe('123456');
  });

  it('não completa com código parcial e ignora letras', async () => {
    const onComplete = jest.fn();
    await renderWithTheme(<Harness onComplete={onComplete} />);
    await fireEvent.changeText(screen.getByTestId('otp'), '12a3');
    expect(screen.getByTestId('otp').props.value).toBe('123');
    expect(onComplete).not.toHaveBeenCalled();
  });
});
