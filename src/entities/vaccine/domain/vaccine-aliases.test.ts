import { VACCINE_ALIASES } from './vaccine-aliases';

/** Tabela "Códigos de vacina sugeridos" de docs/features/calendario-vacinal-pni.md §2 (sem 'other'). */
const PNI_CODES = [
  'hepatitis_b', 'bcg', 'penta', 'ipv', 'rotavirus', 'pcv20', 'pcv10', 'menc', 'menacwy', 'influenza', 'covid19',
  'yellow_fever', 'mmr', 'mmrv', 'dtp', 'varicella', 'hepatitis_a', 'hpv4', 'dengue', 'dt', 'dtpa', 'rsv',
];

describe('VACCINE_ALIASES (Apêndice B.2)', () => {
  it('todo código existe na tabela de códigos do PNI', () => {
    for (const { code } of VACCINE_ALIASES) expect(PNI_CODES).toContain(code);
  });

  it('cobre todos os códigos do PNI, sem repetir', () => {
    expect(VACCINE_ALIASES.map((v) => v.code).sort()).toEqual([...PNI_CODES].sort());
  });

  it('não usa os códigos antigos do parser', () => {
    const codes = VACCINE_ALIASES.map((v) => v.code);
    for (const old of ['vip', 'pneumococcal_conjugate', 'meningococcal_c', 'meningococcal_acwy', 'hpv']) {
      expect(codes).not.toContain(old);
    }
  });

  it('aliases normalizados: minúsculas e sem acento', () => {
    for (const { aliases } of VACCINE_ALIASES) {
      for (const alias of aliases) expect(alias).toBe(alias.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
    }
  });
});
