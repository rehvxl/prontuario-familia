// Calendário de referência: docs/features/calendario-vacinal-pni.md (§3–§9 com a "Revisão independente").
// Convenções do app sobre a tabela, para que o adulto sem registro nunca fique "atrasado" (R10):
// - as linhas da criança com "conforme histórico" na faixa seguinte terminam onde essa faixa começa
//   (febre amarela D1 e reforço < 5a; tríplice viral D1 e D2 < 10a); dali em diante vale a regra sem idade recomendada;
// - VPC13 e VPC15 da rede privada contam para a série pneumocócica (spec §13, L5);
// - as regras não automáticas usam a faixa etária da tabela em que aparecem; as da gestante, a partir de 10 anos.
import type { DoseKey, ScheduleAge, VaccineScheduleRule } from './types';
import { VACCINE_ALIASES } from './vaccine-aliases';

export const SCHEDULE_VERSION = 'PNI-2026-ed4' as const;

const m = (months: number, days?: number): ScheduleAge => (days ? { months, days } : { months });
const a = (years: number): ScheduleAge => ({ months: years * 12 });

const PCV = ['pcv20', 'pcv10', 'pcv13', 'pcv15'];
const TOXOID = ['dt', 'dtpa', 'dtp', 'penta'];

type RuleInput = Omit<VaccineScheduleRule, 'catalogVersion' | 'countsAs' | 'automatic'> &
  Partial<Pick<VaccineScheduleRule, 'countsAs' | 'automatic'>>;

const rule = (r: RuleInput): VaccineScheduleRule => ({
  catalogVersion: SCHEDULE_VERSION,
  countsAs: [r.vaccineCode],
  automatic: true,
  ...r,
});

/** Referência que não vira pendência (F3.8): aparece em "Outras indicações do calendário". */
const reference = (
  id: string,
  vaccineCode: string,
  windowStart: ScheduleAge,
  windowEnd: ScheduleAge | null,
  note: string,
): VaccineScheduleRule =>
  rule({ id, series: id, ordinal: 1, doseKey: 'DU', vaccineCode, recommended: null, windowStart, windowEnd, automatic: false, note });

export const VACCINE_SCHEDULE: VaccineScheduleRule[] = [
  // Criança (0 a 9 anos)
  rule({ id: 'hepatitis_b_birth', series: 'hb_birth', ordinal: 1, doseKey: 'DU', doseLabel: 'Dose ao nascer', vaccineCode: 'hepatitis_b', recommended: m(0), windowStart: m(0), windowEnd: m(1), note: 'Somente até 1 mês de vida.' }),
  rule({ id: 'bcg_du', series: 'bcg', ordinal: 1, doseKey: 'DU', vaccineCode: 'bcg', recommended: m(0), windowStart: m(0), windowEnd: a(5), note: 'Confirme com a unidade de saúde.' }),
  rule({ id: 'penta_d1', series: 'dtp_series', ordinal: 1, doseKey: 'D1', vaccineCode: 'penta', recommended: m(2), windowStart: m(2), windowEnd: a(7), minIntervalFromPreviousDays: 60 }),
  rule({ id: 'penta_d2', series: 'dtp_series', ordinal: 2, doseKey: 'D2', vaccineCode: 'penta', recommended: m(4), windowStart: m(2), windowEnd: a(7), minIntervalFromPreviousDays: 60 }),
  rule({ id: 'penta_d3', series: 'dtp_series', ordinal: 3, doseKey: 'D3', vaccineCode: 'penta', recommended: m(6), windowStart: m(2), windowEnd: a(7), minIntervalFromPreviousDays: 60 }),
  rule({ id: 'ipv_d1', series: 'polio', ordinal: 1, doseKey: 'D1', vaccineCode: 'ipv', recommended: m(2), windowStart: m(2), windowEnd: a(5), minIntervalFromPreviousDays: 60 }),
  rule({ id: 'ipv_d2', series: 'polio', ordinal: 2, doseKey: 'D2', vaccineCode: 'ipv', recommended: m(4), windowStart: m(2), windowEnd: a(5), minIntervalFromPreviousDays: 60 }),
  rule({ id: 'ipv_d3', series: 'polio', ordinal: 3, doseKey: 'D3', vaccineCode: 'ipv', recommended: m(6), windowStart: m(2), windowEnd: a(5), minIntervalFromPreviousDays: 60 }),
  rule({ id: 'ipv_r1', series: 'polio', ordinal: 4, doseKey: 'R1', vaccineCode: 'ipv', recommended: m(15), windowStart: m(15), windowEnd: a(5) }),
  rule({ id: 'ipv_r2', series: 'polio', ordinal: 5, doseKey: 'R2', vaccineCode: 'ipv', recommended: a(4), windowStart: a(4), windowEnd: a(5) }),
  rule({ id: 'rotavirus_d1', series: 'rotavirus', ordinal: 1, doseKey: 'D1', vaccineCode: 'rotavirus', recommended: m(2), windowStart: m(1, 15), windowEnd: m(12), minIntervalFromPreviousDays: 60 }),
  rule({ id: 'rotavirus_d2', series: 'rotavirus', ordinal: 2, doseKey: 'D2', vaccineCode: 'rotavirus', recommended: m(4), windowStart: m(3, 15), windowEnd: m(24), minIntervalFromPreviousDays: 60, requiresRule: 'rotavirus_d1' }),
  rule({ id: 'pcv_d1', series: 'pcv', ordinal: 1, doseKey: 'D1', vaccineCode: 'pcv20', countsAs: PCV, recommended: m(2), windowStart: m(2), windowEnd: m(12), minIntervalFromPreviousDays: 60 }),
  rule({ id: 'pcv_d2', series: 'pcv', ordinal: 2, doseKey: 'D2', vaccineCode: 'pcv10', countsAs: PCV, recommended: m(4), windowStart: m(2), windowEnd: m(12), minIntervalFromPreviousDays: 60 }),
  rule({ id: 'pcv_r', series: 'pcv', ordinal: 3, doseKey: 'R', vaccineCode: 'pcv20', countsAs: PCV, recommended: m(12), windowStart: m(12), windowEnd: a(5), minIntervalFromPreviousDays: 60, completedByDoseFromAge: m(12) }),
  rule({ id: 'menc_d1', series: 'mening', ordinal: 1, doseKey: 'D1', vaccineCode: 'menc', recommended: m(3), windowStart: m(3), windowEnd: m(12), minIntervalFromPreviousDays: 60 }),
  rule({ id: 'menc_d2', series: 'mening', ordinal: 2, doseKey: 'D2', vaccineCode: 'menc', recommended: m(5), windowStart: m(3), windowEnd: m(12), minIntervalFromPreviousDays: 60 }),
  rule({ id: 'menacwy_r', series: 'mening', ordinal: 3, doseKey: 'R', vaccineCode: 'menacwy', countsAs: ['menacwy', 'menc'], recommended: m(12), windowStart: m(12), windowEnd: a(5), minIntervalFromPreviousDays: 60, completedByDoseFromAge: m(12) }),
  // ordinal 2 = primeira vez com 2 doses no ano (R12); o ano civil faz as vezes da temporada.
  rule({ id: 'influenza_child', series: 'influenza', ordinal: 2, doseKey: 'ANUAL', vaccineCode: 'influenza', recommended: m(6), windowStart: m(6), windowEnd: a(6), minIntervalFromPreviousDays: 30, note: 'A temporada é contada pelo ano civil.' }),
  rule({ id: 'covid19_d1', series: 'covid_infant', ordinal: 1, doseKey: 'D1', vaccineCode: 'covid19', recommended: m(6), windowStart: m(6), windowEnd: a(5) }),
  rule({ id: 'covid19_d2', series: 'covid_infant', ordinal: 2, doseKey: 'D2', vaccineCode: 'covid19', recommended: m(7), windowStart: m(6), windowEnd: a(5), minIntervalFromPreviousDays: 28 }),
  rule({ id: 'covid19_d3', series: 'covid_infant', ordinal: 3, doseKey: 'D3', vaccineCode: 'covid19', recommended: m(9), windowStart: m(6), windowEnd: a(5), minIntervalFromPreviousDays: 56 }),
  rule({ id: 'yellow_fever_d1', series: 'yf', ordinal: 1, doseKey: 'D1', vaccineCode: 'yellow_fever', recommended: m(9), windowStart: m(9), windowEnd: a(5) }),
  rule({ id: 'yellow_fever_r', series: 'yf', ordinal: 2, doseKey: 'R', vaccineCode: 'yellow_fever', recommended: a(4), windowStart: a(4), windowEnd: a(5), minIntervalFromPreviousDays: 30 }),
  rule({ id: 'mmr_d1', series: 'mmr', ordinal: 1, doseKey: 'D1', vaccineCode: 'mmr', countsAs: ['mmr', 'mmrv'], recommended: m(12), windowStart: m(12), windowEnd: a(10), minIntervalFromPreviousDays: 30, note: 'Em menores de 2 anos, não aplicar junto com a febre amarela (intervalo de 30 dias).' }),
  rule({ id: 'mmr_d2', series: 'mmr', ordinal: 2, doseKey: 'D2', vaccineCode: 'mmr', countsAs: ['mmr', 'mmrv'], recommended: m(15), windowStart: m(12), windowEnd: a(10), minIntervalFromPreviousDays: 30 }),
  rule({ id: 'dtp_r1', series: 'dtp_series', ordinal: 1, doseKey: 'R1', vaccineCode: 'dtp', recommended: m(15), windowStart: m(15), windowEnd: a(7) }),
  rule({ id: 'dtp_r2', series: 'dtp_series', ordinal: 2, doseKey: 'R2', vaccineCode: 'dtp', recommended: a(4), windowStart: a(4), windowEnd: a(7) }),
  rule({ id: 'varicella_d1', series: 'varicella', ordinal: 1, doseKey: 'D1', vaccineCode: 'varicella', countsAs: ['varicella', 'mmrv'], recommended: m(15), windowStart: m(15), windowEnd: a(7), note: 'Se já teve catapora, informe ao profissional.' }),
  rule({ id: 'varicella_d2', series: 'varicella', ordinal: 2, doseKey: 'D2', vaccineCode: 'varicella', countsAs: ['varicella', 'mmrv'], recommended: a(4), windowStart: m(15), windowEnd: a(7), note: 'Se já teve catapora, informe ao profissional.' }),
  rule({ id: 'hepatitis_a_du', series: 'hepatitis_a', ordinal: 1, doseKey: 'DU', vaccineCode: 'hepatitis_a', recommended: m(15), windowStart: m(15), windowEnd: a(5) }),
  rule({ id: 'hpv4_du', series: 'hpv', ordinal: 1, doseKey: 'DU', vaccineCode: 'hpv4', recommended: a(9), windowStart: a(9), windowEnd: a(15) }),

  // Adolescente e jovem (10 a 24 anos)
  rule({ id: 'dengue_d1', series: 'dengue', ordinal: 1, doseKey: 'D1', vaccineCode: 'dengue', recommended: a(10), windowStart: a(10), windowEnd: a(15), note: 'Confirme a oferta na sua unidade de saúde.' }),
  rule({ id: 'dengue_d2', series: 'dengue', ordinal: 2, doseKey: 'D2', vaccineCode: 'dengue', recommended: m(123), windowStart: a(10), windowEnd: a(15), minIntervalFromPreviousDays: 90, note: 'Confirme a oferta na sua unidade de saúde.' }),
  // A dose da criança (12 m) não substitui a do adolescente: conta a 2ª dose ou uma dose a partir dos 11 anos.
  rule({ id: 'menacwy_teen', series: 'menacwy_teen', ordinal: 2, doseKey: 'DU', vaccineCode: 'menacwy', recommended: a(11), windowStart: a(11), windowEnd: a(15), completedByDoseFromAge: a(11) }),

  // Conforme histórico (R10): sem idade recomendada, nunca "atrasada"
  rule({ id: 'hepatitis_b_history', series: 'hb_adult', ordinal: 3, doseKey: 'D3', doseLabel: '3 doses', vaccineCode: 'hepatitis_b', countsAs: ['hepatitis_b', 'penta'], recommended: null, windowStart: a(7), windowEnd: null, note: 'Esquema de 3 doses (0, 1 e 6 meses), conforme o histórico. Não é preciso reiniciar o esquema.' }),
  rule({ id: 'dt_basic', series: 'dt', ordinal: 3, doseKey: 'D3', doseLabel: '3 doses', vaccineCode: 'dt', countsAs: TOXOID, recommended: null, windowStart: a(7), windowEnd: null, minIntervalFromPreviousDays: 60, note: 'Esquema de 3 doses com toxoide diftérico e tetânico, conforme o histórico.' }),
  // R11: reforço 10 anos após a última dose com toxoide; espera o esquema básico (dt_basic).
  rule({ id: 'dt_booster', series: 'dt', ordinal: 3, doseKey: 'R', vaccineCode: 'dt', countsAs: TOXOID, recommended: null, windowStart: a(7), windowEnd: null, repeatEveryMonths: 120, note: '1 dose a cada 10 anos após a última.' }),
  rule({ id: 'yellow_fever_history', series: 'yf', ordinal: 2, doseKey: 'DU', vaccineCode: 'yellow_fever', recommended: null, windowStart: a(5), windowEnd: a(60), completedByDoseFromAge: a(5), note: 'Uma dose a partir dos 5 anos, ou duas antes dos 5, completa o esquema.' }),
  rule({ id: 'mmr_teen', series: 'mmr', ordinal: 2, doseKey: 'D2', doseLabel: '2 doses', vaccineCode: 'mmr', countsAs: ['mmr', 'mmrv'], recommended: null, windowStart: a(10), windowEnd: a(30), minIntervalFromPreviousDays: 30 }),
  rule({ id: 'mmr_adult', series: 'mmr', ordinal: 1, doseKey: 'DU', vaccineCode: 'mmr', countsAs: ['mmr', 'mmrv'], recommended: null, windowStart: a(30), windowEnd: a(60) }),

  // Idoso (60 anos ou mais)
  rule({ id: 'influenza_elder', series: 'influenza', ordinal: 1, doseKey: 'ANUAL', vaccineCode: 'influenza', recommended: a(60), windowStart: a(60), windowEnd: null, note: 'A temporada é contada pelo ano civil.' }),
  rule({ id: 'covid19_periodic', series: 'covid_periodic', ordinal: 1, doseKey: 'PERIODICA', vaccineCode: 'covid19', recommended: a(60), windowStart: a(60), windowEnd: null, repeatEveryMonths: 6, note: '1 dose a cada 6 meses, com pelo menos 6 meses desde a última.' }),
  rule({ id: 'pcv20_elder', series: 'pcv_elder', ordinal: 1, doseKey: 'DU', vaccineCode: 'pcv20', recommended: null, windowStart: a(85), windowEnd: null, note: 'A partir de 85 anos, para quem não foi vacinado.' }),

  // Outras indicações (automatic = false): o app não conhece a condição
  reference('covid19_special', 'covid19', m(6), null, 'Doses anuais ou semestrais para grupos especiais, conforme avaliação do profissional.'),
  reference('pcv20_indigenous_child', 'pcv20', a(5), a(10), 'Para crianças de povos indígenas sem vacina pneumocócica conjugada.'),
  reference('hpv4_rescue', 'hpv4', a(15), a(20), 'De 15 a 19 anos, para quem não se vacinou, conforme a organização do estado.'),
  reference('varicella_special', 'varicella', a(10), null, 'Para trabalhadores da saúde e povos indígenas, conforme avaliação.'),
  reference('pcv20_special', 'pcv20', a(10), a(60), 'Para trabalhadores da saúde e povos indígenas.'),
  reference('dtpa_health_workers', 'dtpa', a(25), a(60), 'Para profissionais de saúde, parteiras tradicionais e estagiários de maternidade ou internação neonatal. Também substitui a dT nos reforços a cada 10 anos.'),
  reference('pcv20_institutionalized', 'pcv20', a(60), a(85), 'De 60 a 84 anos, para pessoas acamadas ou institucionalizadas.'),
  reference('yellow_fever_elder', 'yellow_fever', a(60), null, 'A partir de 60 anos, só em casos excepcionais, com avaliação caso a caso.'),
  reference('mmr_elder', 'mmr', a(60), null, 'A partir de 60 anos, só para trabalhadores da saúde.'),
  reference('dtpa_pregnancy', 'dtpa', a(10), null, 'Na gestação, a partir da 20ª semana: 1 dose em cada gestação. Puérpera até 45 dias após o parto, se não vacinada na gestação.'),
  reference('rsv_pregnancy', 'rsv', a(10), null, 'Na gestação, a partir da 28ª semana: 1 dose em cada gestação.'),
  reference('hepatitis_b_pregnancy', 'hepatitis_b', a(10), null, 'Na gestação, ao saber da gravidez: 3 doses conforme o histórico, sem reiniciar o esquema.'),
  reference('dt_pregnancy', 'dt', a(10), null, 'Na gestação, ao saber da gravidez: 3 doses conforme o histórico.'),
  reference('influenza_pregnancy', 'influenza', a(10), null, 'Na gestação, em qualquer fase: 1 dose por temporada. Após o parto, até 45 dias, se não vacinada.'),
  reference('covid19_pregnancy', 'covid19', a(10), null, 'Na gestação: 1 dose em cada gestação, com pelo menos 6 meses desde a última.'),
  reference('yellow_fever_pregnancy', 'yellow_fever', a(10), null, 'Na gestação, só em exceção, em área com circulação confirmada e com avaliação do profissional.'),
];

/** Vacinas da rede privada sem linha no calendário, mas que contam para a série pneumocócica (L5). */
const EXTRA_VACCINES = [
  { code: 'pcv13', label: 'Pneumocócica 13-valente' },
  { code: 'pcv15', label: 'Pneumocócica 15-valente' },
];

const LABELS = new Map([...VACCINE_ALIASES, ...EXTRA_VACCINES].map((v) => [v.code, v.label]));

/** Códigos aceitos em `vaccineCode`, além de 'other'. */
export const isCatalogVaccineCode = (code: string): boolean => LABELS.has(code);

/** Nome da vacina pelo catálogo; em 'other', o nome informado. */
export function vaccineLabel(code: string, vaccineName?: string | null): string {
  const name = vaccineName?.trim();
  if (code === 'other') return name || 'Outra vacina';
  return LABELS.get(code) ?? name ?? code;
}

export const DOSE_KEYS: readonly DoseKey[] = ['D1', 'D2', 'D3', 'R1', 'R2', 'R', 'DU', 'ANUAL', 'PERIODICA', 'OUTRA'];

const DOSE_LABELS: Record<DoseKey, string> = {
  D1: '1ª dose',
  D2: '2ª dose',
  D3: '3ª dose',
  R1: '1º reforço',
  R2: '2º reforço',
  R: 'Reforço',
  DU: 'Dose única',
  ANUAL: 'Anual',
  PERIODICA: 'Dose periódica',
  OUTRA: 'Outra dose',
};

/** 'D1' → '1ª dose', 'DU' → 'Dose única'… */
export const doseLabelOf = (key: DoseKey): string => DOSE_LABELS[key];
