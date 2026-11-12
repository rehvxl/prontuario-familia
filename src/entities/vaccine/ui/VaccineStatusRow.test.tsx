import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider } from '@/shared/ui';
import type { VaccineStatus } from '../domain/types';
import { VACCINE_STATUS_APPEARANCE, VaccineStatusRow } from './VaccineStatusRow';

const renderRow = (ui: React.ReactElement) => render(<ThemeProvider scheme="light">{ui}</ThemeProvider>);

describe('VaccineStatusRow', () => {
  it('status com os textos da spec, cada um com ícone próprio (v4: ícone + texto, sem tom; nunca vermelho)', () => {
    const labels: Record<VaccineStatus, string> = {
      late: 'Atrasada pelo calendário',
      due: 'Pendente',
      confirm: 'Confirmar na carteira',
      next: 'Próxima',
      planned: 'Prevista',
      noRecord: 'Sem registro',
      applied: 'Aplicada',
      notApplicable: 'Não se aplica',
    };
    for (const [status, label] of Object.entries(labels)) expect(VACCINE_STATUS_APPEARANCE[status as VaccineStatus].label).toBe(label);
    expect(VACCINE_STATUS_APPEARANCE.late.icon).toBe('clock');
    expect(VACCINE_STATUS_APPEARANCE.applied.icon).toBe('stateIn');
    expect(Object.values(VACCINE_STATUS_APPEARANCE).every((a) => !('soft' in a))).toBe(true);
  });

  it('um elemento acessível com nome, status, detalhe e doses; toca para abrir', async () => {
    const onPress = jest.fn();
    await renderRow(
      <VaccineStatusRow
        vaccineName="Influenza de 2026"
        status="due"
        detail="Anual · a partir de 1 de jan. de 2026"
        doses="Nenhuma dose registrada em 2026"
        onPress={onPress}
        testID="row"
      />,
    );
    const row = screen.getByRole('button', { name: 'Influenza de 2026, pendente, Anual, a partir de 1 de jan. de 2026, Nenhuma dose registrada em 2026' });
    expect(screen.getByText('Pendente')).toBeTruthy();
    await fireEvent.press(row);
    expect(onPress).toHaveBeenCalled();
  });

  it('com "trailing", o controle da direita fica fora do rótulo da linha; texto sem limite de linhas (AX5)', async () => {
    await renderRow(<VaccineStatusRow vaccineName="Varicela" status="notApplicable" detail="1ª dose · Já teve a doença" trailing={<Text accessibilityRole="button">Desfazer</Text>} />);
    expect(screen.getByLabelText('Varicela, não se aplica, 1ª dose, Já teve a doença')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Desfazer' })).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).not.toContain('numberOfLines');
  });
});
