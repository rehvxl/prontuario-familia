import { isEntitled } from '@/shared/lib';
import { trackEmergencyCardEvent } from './analytics';
import { resolveEmergencyEntry } from './entry';

jest.mock('@/shared/lib', () => {
  const actual = jest.requireActual('@/shared/lib');
  return { ...actual, isEntitled: jest.fn(actual.isEntitled) };
});

describe('analytics e entrada da ficha', () => {
  it('só aceita os três nomes e a contagem de campos', () => {
    expect(() => trackEmergencyCardEvent('emergency_card_opened')).not.toThrow();
    expect(() => trackEmergencyCardEvent('emergency_card_present_mode')).not.toThrow();
    expect(() => trackEmergencyCardEvent('emergency_card_saved', { filledFieldCount: 2 })).not.toThrow();
    expect(() => trackEmergencyCardEvent('emergency_card_saved', { filledFieldCount: 1, notes: 'asma' })).toThrow(/não recebe valores/);
    expect(() => trackEmergencyCardEvent('emergency_card_opened', { filledFieldCount: 1 })).toThrow(/não recebe valores/);
    expect(() => trackEmergencyCardEvent('page_view')).toThrow(/não permitido/);
  });

  it('isEntitled permanece verdadeiro e a entrada consulta essa função', () => {
    expect(isEntitled('emergency_card')).toBe(true);
    expect(resolveEmergencyEntry(true)).toBe('card');
    expect(jest.mocked(isEntitled)).toHaveBeenCalledWith('emergency_card');
    expect(resolveEmergencyEntry(false)).toBe('consent');
    jest.mocked(isEntitled).mockReturnValueOnce(false);
    expect(resolveEmergencyEntry(true)).toBe('paywall');
  });
});
