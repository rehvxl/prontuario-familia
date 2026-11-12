import { formatShortDate } from '@/shared/lib';
import { medicationStatus } from './status';

// F4.2 da spec, hoje = 11/11/2026.
const today = '2026-11-11';

describe('medicationStatus (R5)', () => {
  it('início em 01/11 sem fim → Em uso', () => {
    expect(medicationStatus({ startOn: '2026-11-01', endOn: null }, today)).toBe('active');
  });

  it('início em 01/11 e fim em 11/11 → Em uso (o dia do fim conta)', () => {
    expect(medicationStatus({ startOn: '2026-11-01', endOn: '2026-11-11' }, today)).toBe('active');
  });

  it('fim em 10/11 → Encerrado em 10 de nov. de 2026', () => {
    const m = { startOn: '2026-11-01', endOn: '2026-11-10' };
    expect(medicationStatus(m, today)).toBe('ended');
    expect(`Encerrado em ${formatShortDate(m.endOn)}`).toBe('Encerrado em 10 de nov. de 2026');
  });

  it('início em 12/11 → Começa em 12 de nov. de 2026', () => {
    const m = { startOn: '2026-11-12', endOn: null };
    expect(medicationStatus(m, today)).toBe('scheduled');
    expect(`Começa em ${formatShortDate(m.startOn)}`).toBe('Começa em 12 de nov. de 2026');
  });

  it('início hoje → Em uso', () => {
    expect(medicationStatus({ startOn: today, endOn: today }, today)).toBe('active');
  });
});
