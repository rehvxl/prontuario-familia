// Metas da §2 da spec sobre o corpus de 20 documentos fictícios da QA:
// analitos com nome, valor e unidade corretos ≥ 90%; data e tipo do documento corretos ≥ 85%.
// O gabarito abaixo é o que uma pessoa lê no documento (unidade canônica do catálogo), escrito sem olhar a saída do parser.
import type { RecordType } from '@/entities/health-record';
import * as F from './__fixtures__/documents';
import { parseHealthDocument } from './parse-health-document';

const DOCS: Readonly<Record<string, string>> = { ...F };

type Lab = readonly [code: string, value: number, unit: string];
interface Truth { type: RecordType; date: string; labs?: readonly Lab[] }

const TRUTH: Record<keyof typeof F, Truth> = {
  HEMOGRAMA_HORIZONTE: {
    type: 'result', date: '2026-11-03',
    labs: [['erythrocytes', 4.1, 'milhões/mm³'], ['hemoglobin', 11.2, 'g/dL'], ['hematocrit', 34.8, '%'], ['mcv', 84.9, 'fL'], ['mch', 27.3, 'pg'],
      ['mchc', 32.2, 'g/dL'], ['rdw', 13.1, '%'], ['leukocytes', 6800, '/mm³'], ['platelets', 245000, '/mm³']],
  },
  BIOQUIMICA_CERRADO: {
    type: 'result', date: '2026-03-12',
    labs: [['glucose_fasting', 104, 'mg/dL'], ['hba1c', 5.9, '%'], ['creatinine', 1.08, 'mg/dL'], ['egfr', 81, 'mL/min/1,73m²']],
  },
  LIPIDOS_TIREOIDE_SANTA_MONICA: {
    type: 'result', date: '2026-10-05',
    labs: [['cholesterol_total', 214, 'mg/dL'], ['hdl', 52, 'mg/dL'], ['non_hdl', 162, 'mg/dL'], ['triglycerides', 148, 'mg/dL'], ['ldl', 132, 'mg/dL'],
      ['tsh', 2.85, 'µUI/mL'], ['free_t4', 1.21, 'ng/dL']],
  },
  FOTO_SAO_LUCAS_OCR: {
    type: 'result', date: '2026-10-28',
    // o ferro "8O" é 80 no papel: o parser não deve adivinhar, então conta como erro na métrica
    labs: [['ferritin', 18.4, 'ng/mL'], ['iron', 80, 'µg/dL'], ['vitamin_b12', 289, 'pg/mL'], ['vitamin_d', 22, 'ng/mL'], ['crp', 12, 'mg/L'], ['uric_acid', 6.1, 'mg/dL']],
  },
  RENAL_HEPATICO_SANTA_CLARA: {
    type: 'result', date: '2026-09-20',
    labs: [['urea', 38, 'mg/dL'], ['creatinine', 0.92, 'mg/dL'], ['uric_acid', 6.3, 'mg/dL'], ['sodium', 139, 'mEq/L'], ['potassium', 4.8, 'mEq/L'],
      ['ast', 32, 'U/L'], ['alt', 48, 'U/L'], ['ggt', 41, 'U/L'], ['alkaline_phosphatase', 88, 'U/L'], ['bilirubin_total', 0.7, 'mg/dL']],
  },
  URINA_HEMOGRAMA_VIDA_PLENA: {
    type: 'result', date: '2026-08-15',
    labs: [['urine_density', 1.02, ''], ['urine_ph', 6, ''], ['hemoglobin', 12.4, 'g/dL'], ['leukocytes', 7800, '/mm³'], ['platelets', 250000, '/mm³']],
  },
  RECEITA_VIVER_BEM: { type: 'prescription', date: '2026-11-02' },
  VACINAS_IMUNIZAR: { type: 'vaccine', date: '2026-04-15' },
  LAUDO_USG_IMAGEM_VIVA: { type: 'report', date: '2026-06-30' },
  TIREOIDE_FERRO_LABVIDA: {
    type: 'result', date: '2026-09-18',
    labs: [['tsh', 3.1, 'µUI/mL'], ['free_t4', 1.05, 'ng/dL'], ['ferritin', 210, 'ng/mL'], ['iron', 92, 'µg/dL'], ['vitamin_b12', 640, 'pg/mL']],
  },
  HEMOGRAMA_PEDIATRICO_BOM_PASTOR: {
    type: 'result', date: '2026-11-02',
    labs: [['erythrocytes', 4.6, 'milhões/mm³'], ['hemoglobin', 11.8, 'g/dL'], ['hematocrit', 35.1, '%'], ['leukocytes', 9200, '/mm³'], ['platelets', 310000, '/mm³']],
  },
  BIOQUIMICA_PORTAL_SAUDE: {
    type: 'result', date: '2026-07-14',
    labs: [['glucose_fasting', 92, 'mg/dL'], ['urea', 41, 'mg/dL'], ['creatinine', 1.02, 'mg/dL'], ['potassium', 4.3, 'mEq/L'], ['sodium', 141, 'mEq/L'], ['crp', 3.8, 'mg/L']],
  },
  LIPIDOGRAMA_PSA_NOVA_ERA: {
    type: 'result', date: '2026-10-20',
    labs: [['cholesterol_total', 182, 'mg/dL'], ['hdl', 45, 'mg/dL'], ['triglycerides', 168, 'mg/dL'], ['psa_total', 1.1, 'ng/mL']],
  },
  FOTO_HEMOGRAMA_CENTRAL_OCR: {
    type: 'result', date: '2026-10-10',
    labs: [['hemoglobin', 13.9, 'g/dL'], ['hematocrit', 41.2, '%'], ['leukocytes', 5400, '/mm³'], ['platelets', 210000, '/mm³'], ['glucose_fasting', 88, 'mg/dL']],
  },
  RECEITA_UBS_JARDIM: { type: 'prescription', date: '2026-10-05' },
  RECEITA_PEDIATRIA_SORRISO: { type: 'prescription', date: '2026-11-03' },
  // carteira: a data do registro é a da dose mais recente
  CARTEIRA_INFANTIL_UBS_CENTRO: { type: 'vaccine', date: '2026-05-06' },
  VACINAS_ADULTO_SAO_JORGE: { type: 'vaccine', date: '2026-09-12' },
  PEDIDO_EXAMES_VIVER_BEM: { type: 'exam', date: '2026-11-01' },
  LAUDO_RX_TORAX_IMAGEM_VIVA: { type: 'report', date: '2026-07-22' },
};

function measure() {
  let labs = 0;
  let labsOk = 0;
  let dates = 0;
  let types = 0;
  for (const [name, truth] of Object.entries(TRUTH)) {
    const r = parseHealthDocument(DOCS[name]!, { today: '2026-11-11' });
    if (r.date?.value === truth.date) dates += 1;
    if (r.recordType?.value === truth.type) types += 1;
    for (const [code, value, unit] of truth.labs ?? []) {
      labs += 1;
      const found = r.labResults.find((l) => l.code === code);
      if (found && found.value !== null && Math.abs(found.value - value) < 1e-9 && found.unit === unit) labsOk += 1;
    }
  }
  const docs = Object.keys(TRUTH).length;
  return { docs, labs, labsOk, analytes: labsOk / labs, date: dates / docs, type: types / docs };
}

describe('metas do corpus (spec §2)', () => {
  const m = measure();

  it('cobre 20 documentos, com 5 layouts novos de laboratório além dos 9 do ocr-tecnico.md', () => {
    expect(m.docs).toBe(20);
    expect(Object.keys(TRUTH).sort()).toEqual(Object.keys(F).sort());
    expect(m.labs).toBe(66);
  });

  it('analitos com nome, valor e unidade corretos ≥ 90%', () => {
    expect(m.analytes).toBeGreaterThanOrEqual(0.9);
    // hoje: 65 de 66 (o ferro "8O" fica "Confira", como manda a F1.8)
    expect(m.labsOk).toBe(65);
  });

  it('data e tipo do documento corretos ≥ 85%', () => {
    expect(m.date).toBeGreaterThanOrEqual(0.85);
    expect(m.type).toBeGreaterThanOrEqual(0.85);
  });
});
