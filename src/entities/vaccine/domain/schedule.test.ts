import { addAge, addDays, addMonths, monthsBetween } from './calendar-date';
import { DOSE_KEYS, SCHEDULE_VERSION, VACCINE_SCHEDULE, doseLabelOf, isCatalogVaccineCode, vaccineLabel } from './schedule';

// Spec §3.2: palavras vetadas em telas de saúde (as notas aparecem na carteira).
const VETOED = /\b(normal|anormal|alterad[oa]|grave|cr[ií]tico|risco|perigo|alerta|urgente|preocupante|saud[aá]vel|doente|bom|ruim)\b|!/i;

describe('VACCINE_SCHEDULE (calendario-vacinal-pni.md)', () => {
  it('ids únicos, no formato da coluna rule_id e com a versão do catálogo', () => {
    const ids = VACCINE_SCHEDULE.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of VACCINE_SCHEDULE) {
      expect(r.id).toMatch(/^[a-z0-9_]{1,60}$/);
      expect(r.catalogVersion).toBe(SCHEDULE_VERSION);
    }
  });

  it('códigos de vacina e de "conta como" existem no catálogo; OUTRA só na dose registrada', () => {
    for (const r of VACCINE_SCHEDULE) {
      expect(isCatalogVaccineCode(r.vaccineCode)).toBe(true);
      for (const code of r.countsAs) expect(isCatalogVaccineCode(code)).toBe(true);
      expect(r.doseKey).not.toBe('OUTRA');
    }
  });

  it('janelas coerentes e dependências declaradas antes', () => {
    VACCINE_SCHEDULE.forEach((r, i) => {
      if (r.windowEnd) expect(r.windowEnd.months).toBeGreaterThan(r.windowStart.months);
      if (r.recommended && r.windowEnd) expect(r.recommended.months).toBeLessThan(r.windowEnd.months);
      if (r.requiresRule) expect(VACCINE_SCHEDULE.findIndex((x) => x.id === r.requiresRule)).toBeLessThan(i);
    });
  });

  it('VPC13 e VPC15 contam para a série pneumocócica (spec §13, L5)', () => {
    for (const r of VACCINE_SCHEDULE.filter((x) => x.series === 'pcv')) expect(r.countsAs).toEqual(expect.arrayContaining(['pcv13', 'pcv15']));
  });

  it('notas sem palavras vetadas nem exclamação', () => {
    for (const r of VACCINE_SCHEDULE) if (r.note) expect(r.note).not.toMatch(VETOED);
  });

  it('regras não automáticas têm observação (F3.8)', () => {
    for (const r of VACCINE_SCHEDULE.filter((x) => !x.automatic)) expect(r.note).toBeTruthy();
  });
});

describe('rótulos', () => {
  it('doseLabelOf cobre todas as chaves', () => {
    expect(doseLabelOf('D1')).toBe('1ª dose');
    expect(doseLabelOf('D2')).toBe('2ª dose');
    expect(doseLabelOf('R')).toBe('Reforço');
    expect(doseLabelOf('DU')).toBe('Dose única');
    expect(doseLabelOf('ANUAL')).toBe('Anual');
    for (const key of DOSE_KEYS) expect(doseLabelOf(key)).toBeTruthy();
  });

  it('vaccineLabel usa o catálogo; em "other", o nome informado', () => {
    expect(vaccineLabel('yellow_fever')).toBe('Febre amarela');
    expect(vaccineLabel('influenza')).toBe('Influenza');
    expect(vaccineLabel('pcv13')).toBe('Pneumocócica 13-valente');
    expect(vaccineLabel('other', '  Herpes-zóster ')).toBe('Herpes-zóster');
    expect(vaccineLabel('other', null)).toBe('Outra vacina');
    expect(isCatalogVaccineCode('other')).toBe(false);
  });
});

describe('datas por calendário (R7)', () => {
  it('addMonths fica no último dia quando o dia não existe', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-02-29', 12)).toBe('2025-02-28');
    expect(addMonths('2026-01-10', 12)).toBe('2027-01-10');
    expect(addMonths('2026-11-10', -11)).toBe('2025-12-10');
  });

  it('addDays e addAge', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-10', -30)).toBe('2026-02-08');
    expect(addAge('2026-01-10', { months: 1, days: 15 })).toBe('2026-02-25');
  });

  it('monthsBetween: meses completos, véspera e dia exato', () => {
    expect(monthsBetween('2026-01-10', '2026-11-09')).toBe(9);
    expect(monthsBetween('2026-01-10', '2026-11-10')).toBe(10);
    expect(monthsBetween('2026-01-31', '2026-02-28')).toBe(1);
    expect(monthsBetween('2016-11-12', '2026-11-11')).toBe(119);
  });
});
