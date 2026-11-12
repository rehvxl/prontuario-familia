// Catálogo canônico de analitos: Apêndice B.1 de docs/features/ocr-tecnico.md (revisão de 11/11/2026: 37 analitos no bloco, embora o texto diga 36, + 4 sinais vitais).
// `code` é a chave estável das séries: não muda nunca.
import type { VitalCode } from './types';

export type AnalyteGroup = 'hemograma' | 'glicemia' | 'lipidios' | 'tireoide' | 'rins' | 'figado' | 'ferro_vitaminas' | 'inflamacao' | 'urina' | 'prostata';
export interface Analyte {
  code: string;
  label: string;
  group: AnalyteGroup;
  /** Unidade canônica (como exibida). '' = adimensional. */
  unit: string;
  /** Aliases normalizados: minúsculas, sem acento. O mais longo vence. */
  aliases: string[];
  /** Unidade normalizada → fator para a canônica. Só identidades e potências de 10 da mesma grandeza. */
  accepts: Record<string, number>;
  /** Faixa fisicamente plausível na unidade canônica (rejeita erro de OCR e desambigua "1.020"). */
  plausible: [number, number];
  /** Casas decimais mínimas na exibição (o valor nunca perde as casas que o laudo trouxe). */
  decimals: number;
  section?: 'urine';
  /** Linha com o alias mas que é outro exame (ex.: glicose pós-prandial). */
  exclude?: RegExp;
}

export const GROUP_TITLES: Record<AnalyteGroup, string> = {
  hemograma: 'Hemograma', glicemia: 'Glicemia', lipidios: 'Perfil lipídico', tireoide: 'Tireoide', rins: 'Função renal',
  figado: 'Função hepática', ferro_vitaminas: 'Ferro e vitaminas', inflamacao: 'Inflamação', urina: 'Urina tipo I', prostata: 'PSA',
};

const COUNT = { '/mm³': 1, '/µL': 1, 'mil/mm³': 1000, 'mil/µL': 1000, '10³/µL': 1000 };
const ENZYME = { 'U/L': 1, 'UI/L': 1 };
const ION = { 'mEq/L': 1, 'mmol/L': 1 }; // íons monovalentes: mEq = mmol

export const ANALYTES: Analyte[] = [
  { code: 'erythrocytes', label: 'Hemácias', decimals: 2, group: 'hemograma', unit: 'milhões/mm³', aliases: ['hemacias', 'eritrocitos', 'globulos vermelhos', 'contagem de hemacias'], accepts: { 'milhões/mm³': 1, 'milhões/µL': 1, '10⁶/µL': 1, '/mm³': 1e-6, '/µL': 1e-6 }, plausible: [0.5, 9] },
  { code: 'hemoglobin', label: 'Hemoglobina', decimals: 1, group: 'hemograma', unit: 'g/dL', aliases: ['hemoglobina', 'hb', 'hgb'], accepts: { 'g/dL': 1, 'g/L': 0.1 }, plausible: [2, 25] },
  { code: 'hematocrit', label: 'Hematócrito', decimals: 1, group: 'hemograma', unit: '%', aliases: ['hematocrito', 'ht', 'hct'], accepts: { '%': 1 }, plausible: [5, 75] },
  { code: 'mcv', label: 'VCM', decimals: 1, group: 'hemograma', unit: 'fL', aliases: ['vcm', 'volume corpuscular medio'], accepts: { fL: 1, 'µ³': 1 }, plausible: [40, 150] },
  { code: 'mch', label: 'HCM', decimals: 1, group: 'hemograma', unit: 'pg', aliases: ['hcm', 'hemoglobina corpuscular media'], accepts: { pg: 1 }, plausible: [10, 50] },
  { code: 'mchc', label: 'CHCM', decimals: 1, group: 'hemograma', unit: 'g/dL', aliases: ['chcm', 'concentracao de hemoglobina corpuscular media'], accepts: { 'g/dL': 1 }, plausible: [20, 45] },
  { code: 'rdw', label: 'RDW', decimals: 1, group: 'hemograma', unit: '%', aliases: ['rdw', 'rdw-cv'], accepts: { '%': 1 }, plausible: [5, 40] },
  { code: 'leukocytes', label: 'Leucócitos', decimals: 0, group: 'hemograma', unit: '/mm³', aliases: ['leucocitos', 'leucocitos totais', 'globulos brancos', 'contagem de leucocitos'], accepts: COUNT, plausible: [300, 200000] },
  { code: 'platelets', label: 'Plaquetas', decimals: 0, group: 'hemograma', unit: '/mm³', aliases: ['plaquetas', 'contagem de plaquetas', 'plt'], accepts: COUNT, plausible: [5000, 2000000] },
  { code: 'glucose_fasting', label: 'Glicose em jejum', decimals: 0, group: 'glicemia', unit: 'mg/dL', aliases: ['glicose', 'glicemia', 'glicemia de jejum', 'glicose em jejum', 'glicose jejum'], accepts: { 'mg/dL': 1 }, plausible: [10, 1500], exclude: /pos[- ]?prandial|curva|tolerancia|apos|\d+ ?min|capilar|urina/ },
  { code: 'hba1c', label: 'Hemoglobina glicada (HbA1c)', decimals: 1, group: 'glicemia', unit: '%', aliases: ['hemoglobina glicada', 'hemoglobina glicosilada', 'glico-hemoglobina', 'hba1c', 'a1c'], accepts: { '%': 1 }, plausible: [2, 20] },
  { code: 'cholesterol_total', label: 'Colesterol total', decimals: 0, group: 'lipidios', unit: 'mg/dL', aliases: ['colesterol total'], accepts: { 'mg/dL': 1 }, plausible: [40, 1000] },
  { code: 'hdl', label: 'Colesterol HDL', decimals: 0, group: 'lipidios', unit: 'mg/dL', aliases: ['colesterol hdl', 'hdl colesterol', 'hdl-colesterol', 'hdl-c', 'hdl'], accepts: { 'mg/dL': 1 }, plausible: [5, 200] },
  { code: 'ldl', label: 'Colesterol LDL', decimals: 0, group: 'lipidios', unit: 'mg/dL', aliases: ['colesterol ldl', 'ldl colesterol', 'ldl-colesterol', 'ldl-c', 'ldl'], accepts: { 'mg/dL': 1 }, plausible: [5, 600] },
  { code: 'non_hdl', label: 'Colesterol não-HDL', decimals: 0, group: 'lipidios', unit: 'mg/dL', aliases: ['colesterol nao-hdl', 'colesterol nao hdl', 'nao-hdl', 'nao hdl'], accepts: { 'mg/dL': 1 }, plausible: [5, 800] },
  { code: 'triglycerides', label: 'Triglicerídeos', decimals: 0, group: 'lipidios', unit: 'mg/dL', aliases: ['triglicerideos', 'triglicerides', 'triglicerides totais', 'triglicerideos totais'], accepts: { 'mg/dL': 1 }, plausible: [10, 10000] },
  { code: 'tsh', label: 'TSH', decimals: 2, group: 'tireoide', unit: 'µUI/mL', aliases: ['tsh', 'hormonio tireoestimulante', 'tireotrofina'], accepts: { 'µUI/mL': 1, 'mUI/L': 1 }, plausible: [0.001, 500] },
  { code: 'free_t4', label: 'T4 livre', decimals: 2, group: 'tireoide', unit: 'ng/dL', aliases: ['t4 livre', 't4l', 'tiroxina livre'], accepts: { 'ng/dL': 1 }, plausible: [0.05, 10] },
  { code: 'urea', label: 'Ureia', decimals: 0, group: 'rins', unit: 'mg/dL', aliases: ['ureia'], accepts: { 'mg/dL': 1 }, plausible: [2, 500], exclude: /urina/ },
  { code: 'creatinine', label: 'Creatinina', decimals: 1, group: 'rins', unit: 'mg/dL', aliases: ['creatinina'], accepts: { 'mg/dL': 1 }, plausible: [0.05, 25], exclude: /urina|clearance|depuracao/ },
  { code: 'egfr', label: 'TFG estimada', decimals: 0, group: 'rins', unit: 'mL/min/1,73m²', aliases: ['taxa de filtracao glomerular', 'tfg estimada', 'tfg', 'egfr', 'rfg estimado'], accepts: { 'mL/min/1,73m²': 1 }, plausible: [1, 200] },
  { code: 'uric_acid', label: 'Ácido úrico', decimals: 1, group: 'rins', unit: 'mg/dL', aliases: ['acido urico'], accepts: { 'mg/dL': 1 }, plausible: [0.3, 25], exclude: /urina/ },
  { code: 'sodium', label: 'Sódio', decimals: 0, group: 'rins', unit: 'mEq/L', aliases: ['sodio'], accepts: ION, plausible: [90, 200] },
  { code: 'potassium', label: 'Potássio', decimals: 1, group: 'rins', unit: 'mEq/L', aliases: ['potassio'], accepts: ION, plausible: [1, 12] },
  { code: 'ast', label: 'AST (TGO)', decimals: 0, group: 'figado', unit: 'U/L', aliases: ['tgo', 'ast', 'aspartato aminotransferase', 'transaminase oxalacetica'], accepts: ENZYME, plausible: [1, 20000] },
  { code: 'alt', label: 'ALT (TGP)', decimals: 0, group: 'figado', unit: 'U/L', aliases: ['tgp', 'alt', 'alanina aminotransferase', 'transaminase piruvica'], accepts: ENZYME, plausible: [1, 20000] },
  { code: 'ggt', label: 'Gama-GT', decimals: 0, group: 'figado', unit: 'U/L', aliases: ['gama gt', 'gama-gt', 'ggt', 'gama glutamil transferase', 'gama-glutamiltransferase'], accepts: ENZYME, plausible: [1, 10000] },
  { code: 'alkaline_phosphatase', label: 'Fosfatase alcalina', decimals: 0, group: 'figado', unit: 'U/L', aliases: ['fosfatase alcalina'], accepts: ENZYME, plausible: [5, 10000] },
  { code: 'bilirubin_total', label: 'Bilirrubina total', decimals: 1, group: 'figado', unit: 'mg/dL', aliases: ['bilirrubina total'], accepts: { 'mg/dL': 1 }, plausible: [0, 50] },
  { code: 'ferritin', label: 'Ferritina', decimals: 0, group: 'ferro_vitaminas', unit: 'ng/mL', aliases: ['ferritina'], accepts: { 'ng/mL': 1, 'µg/L': 1 }, plausible: [1, 50000] },
  { code: 'iron', label: 'Ferro sérico', decimals: 0, group: 'ferro_vitaminas', unit: 'µg/dL', aliases: ['ferro serico', 'ferro'], accepts: { 'µg/dL': 1 }, plausible: [5, 1000] },
  { code: 'vitamin_d', label: 'Vitamina D (25-OH)', decimals: 1, group: 'ferro_vitaminas', unit: 'ng/mL', aliases: ['vitamina d', '25-hidroxivitamina d', '25 hidroxivitamina d', '25-oh vitamina d', '25(oh)d'], accepts: { 'ng/mL': 1 }, plausible: [1, 300] },
  { code: 'vitamin_b12', label: 'Vitamina B12', decimals: 0, group: 'ferro_vitaminas', unit: 'pg/mL', aliases: ['vitamina b12', 'cobalamina', 'b12'], accepts: { 'pg/mL': 1, 'ng/L': 1 }, plausible: [30, 10000] },
  { code: 'crp', label: 'Proteína C reativa', decimals: 1, group: 'inflamacao', unit: 'mg/L', aliases: ['proteina c reativa', 'pcr'], accepts: { 'mg/L': 1, 'mg/dL': 10 }, plausible: [0, 600] },
  { code: 'psa_total', label: 'PSA total', decimals: 2, group: 'prostata', unit: 'ng/mL', aliases: ['psa total', 'antigeno prostatico especifico total'], accepts: { 'ng/mL': 1 }, plausible: [0, 5000] },
  { code: 'urine_density', label: 'Densidade urinária', decimals: 3, group: 'urina', unit: '', aliases: ['densidade'], accepts: { '': 1 }, plausible: [1.0, 1.06], section: 'urine' },
  { code: 'urine_ph', label: 'pH urinário', decimals: 1, group: 'urina', unit: '', aliases: ['ph'], accepts: { '': 1 }, plausible: [4, 9.5], section: 'urine' },
];

/** Sinais vitais (manuais): mesmo catálogo, `kind: 'vital'`. Não saem do parser. */
export const VITALS: { code: VitalCode; label: string; unit: string; decimals: number }[] = [
  { code: 'bp', label: 'Pressão arterial', unit: 'mmHg', decimals: 0 }, // value = sistólica, value2 = diastólica
  { code: 'glucose_capillary', label: 'Glicemia capilar', unit: 'mg/dL', decimals: 0 },
  { code: 'weight', label: 'Peso', unit: 'kg', decimals: 1 },
  { code: 'height', label: 'Altura', unit: 'cm', decimals: 0 }, // em 'm', 2 casas (formatMeasurementValue)
];

/** Grafias de unidade (normalizadas: minúsculas, sem espaços, µ unificado) → forma exibida. */
export const UNIT_ALIASES: Record<string, string> = {
  'g/dl': 'g/dL', 'g/l': 'g/L', 'mg/dl': 'mg/dL', 'mg/l': 'mg/L', 'ng/ml': 'ng/mL', 'ng/dl': 'ng/dL', 'ng/l': 'ng/L',
  'pg/ml': 'pg/mL', 'µg/dl': 'µg/dL', 'ug/dl': 'µg/dL', 'mcg/dl': 'µg/dL', 'µg/l': 'µg/L', 'ug/l': 'µg/L',
  'µui/ml': 'µUI/mL', 'uui/ml': 'µUI/mL', 'µiu/ml': 'µUI/mL', 'uiu/ml': 'µUI/mL', 'mui/l': 'mUI/L', 'miu/l': 'mUI/L',
  'u/l': 'U/L', 'ui/l': 'UI/L', 'meq/l': 'mEq/L', 'mmol/l': 'mmol/L', '%': '%', 'fl': 'fL', 'µ³': 'µ³', 'u3': 'µ³', 'pg': 'pg',
  '/mm³': '/mm³', '/mm3': '/mm³', '/µl': '/µL', '/ul': '/µL', 'mil/mm³': 'mil/mm³', 'mil/mm3': 'mil/mm³', 'mil/µl': 'mil/µL', 'mil/ul': 'mil/µL',
  'milhoes/mm³': 'milhões/mm³', 'milhoes/mm3': 'milhões/mm³', 'milhoes/µl': 'milhões/µL', 'milhoes/ul': 'milhões/µL',
};

/** Analito do catálogo pelo `code` (vitais e 'other' não estão aqui). */
export function findAnalyte(code: string): Analyte | undefined {
  return ANALYTES.find((a) => a.code === code);
}
