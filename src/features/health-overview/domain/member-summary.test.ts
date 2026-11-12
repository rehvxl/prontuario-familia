import { TODAY, UP_TO_DATE_DOSES, lab, medication, member, vital } from './__fixtures__/health';
import { buildMemberSummary } from './member-summary';

const carlos = member('carlos', 'Carlos Souza', '1996-01-01');
const summary = (over: Partial<Parameters<typeof buildMemberSummary>[0]> = {}) =>
  buildMemberSummary({ member: carlos, measurements: [], doses: [], dismissals: [], medications: [], today: TODAY, ...over });

describe('buildMemberSummary — vacinas (R13, R14)', () => {
  it('sem data de nascimento: nenhuma pendência e não está em dia', () => {
    expect(summary({ member: member('ana', 'Ana', null) }).vaccines).toEqual({
      missingBirthDate: true,
      upToDate: false,
      pendingCount: 0,
      first: null,
    });
  });

  it('adulto sem registros: pendências "Confirmar na carteira", nunca atrasada (R10)', () => {
    const { vaccines } = summary();
    expect(vaccines.upToDate).toBe(false);
    expect(vaccines.pendingCount).toBeGreaterThan(0);
    expect(vaccines.first?.status).toBe('confirm');
  });

  it('esquema completo: em dia e 0 pendências', () => {
    expect(summary({ doses: UP_TO_DATE_DOSES('carlos') }).vaccines).toMatchObject({ upToDate: true, pendingCount: 0 });
  });

  it('criança de 10 meses sem doses: a primeira pendência é atrasada pelo calendário', () => {
    const { vaccines } = summary({ member: member('lia', 'Lia Souza', '2026-01-10') });
    expect(vaccines.first?.status).toBe('late');
  });
});

describe('buildMemberSummary — exames recentes (F6.2, R15)', () => {
  it('último resultado por série, só dos últimos 12 meses (11/11/2025 entra, 10/11/2025 não)', () => {
    const { recentLabs } = summary({
      measurements: [
        lab('carlos', { code: 'glucose', label: 'Glicose', takenOn: '2025-11-11', value: 90, referenceLow: 70, referenceHigh: 99 }),
        lab('carlos', { code: 'creatinine', label: 'Creatinina', takenOn: '2025-11-10', value: 1, referenceLow: 0.7, referenceHigh: 1.3 }),
        lab('carlos', { takenOn: '2026-03-01', value: 6.1 }),
        lab('carlos', { takenOn: '2026-10-12', value: 7.4 }),
      ],
    });
    expect(recentLabs.map((s) => s.code)).toEqual(['hba1c', 'glucose']);
    expect(recentLabs[0]?.latest.value).toBe(7.4);
  });

  it('fora da faixa primeiro, depois por data (mais recente primeiro), até 5 séries', () => {
    const codes = ['a', 'b', 'c', 'd', 'e', 'f'];
    const inRange = codes.map((code, i) =>
      lab('carlos', { code, label: code, takenOn: `2026-10-0${i + 1}`, value: 5 }),
    );
    const out = lab('carlos', { code: 'old_out', label: 'Fora', takenOn: '2026-01-15', value: 3.9 });
    const { recentLabs } = summary({ measurements: [...inRange, out] });
    expect(recentLabs.map((s) => s.code)).toEqual(['old_out', 'f', 'e', 'd', 'c']);
  });

  it('sinais vitais não entram em exames', () => {
    const { recentLabs } = summary({ measurements: [vital('carlos', { code: 'weight', label: 'Peso', unit: 'kg', value: 80 })] });
    expect(recentLabs).toEqual([]);
  });
});

describe('buildMemberSummary — medicamentos em uso (R5)', () => {
  it('só os em uso: fim hoje conta, fim ontem e início amanhã não', () => {
    const { activeMedications } = summary({
      medications: [
        medication('carlos', { name: 'Contínuo' }),
        medication('carlos', { name: 'Termina hoje', startOn: '2026-11-05', endOn: '2026-11-11' }),
        medication('carlos', { name: 'Terminou ontem', startOn: '2026-11-01', endOn: '2026-11-10' }),
        medication('carlos', { name: 'Começa amanhã', startOn: '2026-11-12' }),
      ],
    });
    expect(activeMedications.map((m) => m.name)).toEqual(['Contínuo', 'Termina hoje']);
  });

  it('no máximo 5', () => {
    const many = Array.from({ length: 7 }, (_, i) => medication('carlos', { name: `M${i}` }));
    expect(summary({ medications: many }).activeMedications).toHaveLength(5);
  });
});

describe('buildMemberSummary — sinais vitais', () => {
  it('última medida de cada sinal, por data e hora; sinal sem medida fica de fora', () => {
    const { vitals } = summary({
      measurements: [
        vital('carlos', { code: 'bp', label: 'Pressão arterial', unit: 'mmHg', value: 120, value2: 80, takenOn: '2026-11-10', takenAt: '08:00' }),
        vital('carlos', { code: 'bp', label: 'Pressão arterial', unit: 'mmHg', value: 130, value2: 85, takenOn: '2026-11-10', takenAt: '20:00' }),
        vital('carlos', { code: 'bp', label: 'Pressão arterial', unit: 'mmHg', value: 110, value2: 70, takenOn: '2026-10-01' }),
        vital('carlos', { code: 'weight', label: 'Peso', unit: 'kg', value: 80, takenOn: '2026-09-01' }),
      ],
    });
    expect(vitals.bp?.value).toBe(130);
    expect(vitals.weight?.value).toBe(80);
    expect(vitals.height).toBeUndefined();
    expect(vitals.glucose_capillary).toBeUndefined();
  });
});
