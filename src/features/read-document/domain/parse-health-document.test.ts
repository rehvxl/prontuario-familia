// Saídas esperadas dos 20 textos do corpus com hoje = 2026-11-11 e sem `sex` (ocr-tecnico.md §e, alinhado à spec).
// Os 9 primeiros são os do Apêndice C; a única mudança é a F1.8 (o ferro "8O" agora vira linha "Confira", sem valor).
import { computeFlag } from '@/entities/measurement';
import { medicationEndOn } from '@/entities/medication';
import * as F from './__fixtures__/documents';
import { findDates, numberCandidates, parseHealthDocument, readDose, readDuration } from './parse-health-document';

const DOCS: Readonly<Record<string, string>> = { ...F };

const TODAY = '2026-11-11';
const head = (s: { value: unknown; confidence: string } | null) => (s ? [s.value, s.confidence] : null);

interface Expected {
  patientName: unknown; recordType: unknown; title: unknown; date: unknown; location: unknown; professional: unknown;
  labs?: unknown[]; vaccines?: unknown[]; medications?: unknown[]; warnings: string[];
}

// labs: [code, valor, unidade, refLow, refHigh, flag, confiança]
// vaccines: [código, doseKey, dose, lote, aplicada em, local, confiança]
// medications: [nome, dosagem, duração, início, confiança]
const EXPECTED: Record<keyof typeof F, Expected> = {
  BIOQUIMICA_CERRADO: {
    patientName: ['Carlos Eduardo Lima', 'high'], recordType: ['result', 'high'], title: ['Glicemia e função renal', 'medium'],
    date: ['2026-03-12', 'high'], location: ['Bioanálise Cerrado - Medicina Laboratorial', 'medium'], professional: ['Dr. Rafael Nunes (CRM-GO 23456)', 'high'],
    labs: [
      ['glucose_fasting', 104, 'mg/dL', 70, 99, 'high', 'high'],
      ['hba1c', 5.9, '%', null, 5.7, 'high', 'high'],
      ['creatinine', 1.08, 'mg/dL', null, null, 'none', 'high'],
      ['egfr', 81, 'mL/min/1,73m²', 60, null, 'in', 'high'],
    ],
    warnings: [],
  },
  BIOQUIMICA_PORTAL_SAUDE: {
    patientName: ['Dirce Moreira', 'high'], recordType: ['result', 'high'], title: ['Exames laboratoriais', 'medium'],
    date: ['2026-07-14', 'high'], location: ['Portal Saúde Medicina Diagnóstica', 'medium'], professional: ['Dr. Henrique Sales (CRM-SP 76543)', 'high'],
    labs: [
      ['glucose_fasting', 92, 'mg/dL', 70, 99, 'in', 'high'],
      ['urea', 41, 'mg/dL', 15, 45, 'in', 'high'],
      ['creatinine', 1.02, 'mg/dL', 0.5, 1.1, 'in', 'high'],
      ['potassium', 4.3, 'mEq/L', 3.5, 5.1, 'in', 'high'],
      ['sodium', 141, 'mEq/L', 136, 145, 'in', 'high'],
      ['crp', 3.8, 'mg/L', null, 5, 'in', 'high'],
    ],
    warnings: [],
  },
  CARTEIRA_INFANTIL_UBS_CENTRO: {
    patientName: ['Lia Moreira Dias', 'high'], recordType: ['vaccine', 'high'], title: ['Vacinas - Pentavalente (DTP/Hib/HB), Poliomielite inativada (VIP) e mais 2', 'medium'],
    date: ['2026-05-06', 'medium'], location: ['Caderneta de Vacinação - UBS Centro', 'medium'], professional: null,
    vaccines: [
      ['penta', 'D1', '1ª dose', 'PNT2601', '2026-03-05', null, 'high'],
      ['ipv', 'D1', '1ª dose', 'VIP2602', '2026-03-05', null, 'high'],
      ['rotavirus', 'D1', '1ª dose', 'ROT2603', '2026-03-05', null, 'high'],
      ['pcv10', 'D1', '1ª dose', 'PCV2604', '2026-03-05', null, 'high'],
      ['penta', 'D2', '2ª dose', 'PNT2605', '2026-05-06', null, 'high'],
      ['ipv', 'D2', '2ª dose', 'VIP2606', '2026-05-06', null, 'high'],
    ],
    warnings: [],
  },
  FOTO_HEMOGRAMA_CENTRAL_OCR: {
    patientName: ['joao pedro silva', 'medium'], recordType: ['result', 'high'], title: ['Hemograma e glicemia', 'medium'],
    date: ['2026-10-10', 'medium'], location: ['laboratorio central - analises clinicas', 'medium'], professional: null,
    labs: [
      ['hemoglobin', 13.9, 'g/dL', 13.5, 17.5, 'in', 'high'],
      ['hematocrit', 41.2, '%', 39, 50, 'in', 'high'],
      ['leukocytes', 5400, '/mm³', 3500, 10500, 'in', 'high'],
      ['platelets', 210000, '/mm³', 150000, 450000, 'in', 'high'],
      ['glucose_fasting', 88, 'mg/dL', 70, 99, 'in', 'high'],
    ],
    warnings: [],
  },
  FOTO_SAO_LUCAS_OCR: {
    patientName: ['Roberto Dias', 'medium'], recordType: ['result', 'high'], title: ['Exames laboratoriais', 'medium'],
    date: ['2026-10-28', 'medium'], location: ['Clinica Sao Lucas - Analises Clinicas', 'medium'], professional: null,
    labs: [
      ['ferritin', 18.4, 'ng/mL', 13, 150, 'in', 'high'],
      ['iron', null, null, null, null, 'none', 'low'],
      ['vitamin_b12', 289, 'pg/mL', 197, 771, 'in', 'high'],
      ['vitamin_d', 22, 'ng/mL', null, null, 'none', 'high'],
      ['crp', 12, 'mg/L', null, 5, 'high', 'high'],
      ['uric_acid', 6.1, 'mg/dL', 3.4, 7, 'in', 'high'],
    ],
    warnings: ['value-unreadable'],
  },
  HEMOGRAMA_HORIZONTE: {
    patientName: ['Ana Beatriz Moreira', 'high'], recordType: ['result', 'high'], title: ['Hemograma completo', 'medium'],
    date: ['2026-11-03', 'high'], location: ['Laboratório Horizonte - Medicina Diagnóstica', 'medium'], professional: ['Dra. Helena Prado (CRM-MG 45678)', 'high'],
    labs: [
      ['erythrocytes', 4.1, 'milhões/mm³', 3.9, 5.03, 'in', 'high'],
      ['hemoglobin', 11.2, 'g/dL', 12, 15.5, 'low', 'high'],
      ['hematocrit', 34.8, '%', 34.9, 44.5, 'low', 'high'],
      ['mcv', 84.9, 'fL', 81.6, 98.3, 'in', 'high'],
      ['mch', 27.3, 'pg', 26, 34, 'in', 'high'],
      ['mchc', 32.2, 'g/dL', 31, 36, 'in', 'high'],
      ['rdw', 13.1, '%', 11.8, 15.6, 'in', 'high'],
      ['leukocytes', 6800, '/mm³', 3500, 10500, 'in', 'high'],
      ['platelets', 245000, '/mm³', 150000, 450000, 'in', 'high'],
    ],
    warnings: [],
  },
  HEMOGRAMA_PEDIATRICO_BOM_PASTOR: {
    patientName: ['Lia Moreira Dias', 'high'], recordType: ['result', 'high'], title: ['Hemograma completo', 'medium'],
    date: ['2026-11-02', 'high'], location: ['Hospital Infantil Bom Pastor', 'medium'], professional: ['Dra. Sofia Martins (CRM-PR 45123)', 'high'],
    labs: [
      ['erythrocytes', 4.6, 'milhões/mm³', 3.9, 5.5, 'in', 'high'],
      ['hemoglobin', 11.8, 'g/dL', 10.5, 13.5, 'in', 'high'],
      ['hematocrit', 35.1, '%', 33, 39, 'in', 'high'],
      ['leukocytes', 9200, '/mm³', 6000, 17500, 'in', 'high'],
      ['platelets', 310000, '/mm³', 150000, 450000, 'in', 'high'],
    ],
    warnings: [],
  },
  LAUDO_RX_TORAX_IMAGEM_VIVA: {
    patientName: ['Fernanda Lopes', 'high'], recordType: ['report', 'medium'], title: ['Radiografia de Tórax PA e Perfil', 'medium'],
    date: ['2026-07-22', 'high'], location: ['Centro de Diagnóstico Imagem Viva', 'medium'], professional: ['Dr. Eduardo Pires (CRM-SP 65432)', 'high'],
    warnings: [],
  },
  LAUDO_USG_IMAGEM_VIVA: {
    patientName: ['Paulo Henrique Souza', 'high'], recordType: ['report', 'medium'], title: ['Ultrassonografia de Abdome Total', 'medium'],
    date: ['2026-06-30', 'high'], location: ['Centro de Diagnóstico Imagem Viva', 'medium'], professional: ['Dra. Beatriz Nogueira (CRM-SP 98765)', 'high'],
    warnings: [],
  },
  LIPIDOGRAMA_PSA_NOVA_ERA: {
    patientName: ['Carlos Eduardo Lima', 'high'], recordType: ['result', 'high'], title: ['Perfil lipídico e PSA', 'medium'],
    date: ['2026-10-20', 'high'], location: ['Nova Era Laboratório Clínico', 'medium'], professional: ['Dr. Rafael Nunes (CRM-GO 23456)', 'high'],
    labs: [
      ['cholesterol_total', 182, 'mg/dL', null, 190, 'in', 'high'],
      ['hdl', 45, 'mg/dL', 40, null, 'in', 'high'],
      ['triglycerides', 168, 'mg/dL', null, 150, 'high', 'high'],
      ['psa_total', 1.1, 'ng/mL', null, 4, 'in', 'high'],
    ],
    warnings: [],
  },
  LIPIDOS_TIREOIDE_SANTA_MONICA: {
    patientName: ['Juliana Ferreira Alves', 'high'], recordType: ['result', 'high'], title: ['Perfil lipídico e tireoide', 'medium'],
    date: ['2026-10-05', 'high'], location: ['Clínica Santa Mônica', 'medium'], professional: ['Dra. Marina Costa (CRM-RJ 54321)', 'high'],
    labs: [
      ['cholesterol_total', 214, 'mg/dL', null, 190, 'high', 'high'],
      ['hdl', 52, 'mg/dL', 40, null, 'in', 'high'],
      ['non_hdl', 162, 'mg/dL', null, 160, 'high', 'high'],
      ['triglycerides', 148, 'mg/dL', null, 150, 'in', 'high'],
      ['ldl', 132, 'mg/dL', null, null, 'none', 'high'],
      ['tsh', 2.85, 'µUI/mL', 0.45, 4.5, 'in', 'high'],
      ['free_t4', 1.21, 'ng/dL', 0.93, 1.7, 'in', 'high'],
    ],
    warnings: [],
  },
  PEDIDO_EXAMES_VIVER_BEM: {
    patientName: ['Fernanda Lopes', 'high'], recordType: ['exam', 'medium'], title: ['Pedido de exames', 'low'],
    date: ['2026-11-01', 'medium'], location: ['Clínica Viver Bem', 'medium'], professional: ['Dr. Tiago Almeida (CRM-PR 34567)', 'medium'],
    warnings: [],
  },
  RECEITA_PEDIATRIA_SORRISO: {
    patientName: ['Lia Moreira Dias', 'high'], recordType: ['prescription', 'high'], title: ['Receita - Amoxicilina, Paracetamol', 'medium'],
    date: ['2026-11-03', 'medium'], location: ['Clínica Pediátrica Sorriso', 'medium'], professional: ['Dra. Sofia Martins (CRM-PR 45123)', 'high'],
    medications: [
      ['Amoxicilina', '250 mg/5 mL', { kind: 'days', days: 10 }, '2026-11-03', 'high'],
      ['Paracetamol', '200 mg/mL', { kind: 'unknown' }, '2026-11-03', 'high'],
    ],
    warnings: [],
  },
  RECEITA_UBS_JARDIM: {
    patientName: ['Carlos Eduardo Lima', 'high'], recordType: ['prescription', 'high'], title: ['Receita - Metformina, Sinvastatina', 'medium'],
    date: ['2026-10-05', 'medium'], location: ['UBS Jardim das Flores', 'medium'], professional: ['Dra. Patrícia Gomes (CRM-GO 34512)', 'high'],
    medications: [
      ['Metformina', '850 mg', { kind: 'continuous' }, '2026-10-05', 'high'],
      ['Sinvastatina', '20 mg', { kind: 'unknown' }, '2026-10-05', 'high'],
    ],
    warnings: [],
  },
  RECEITA_VIVER_BEM: {
    patientName: ['Fernanda Lopes', 'high'], recordType: ['prescription', 'high'], title: ['Receita - Amoxicilina, Losartana potássica e mais 1', 'medium'],
    date: ['2026-11-02', 'medium'], location: ['Clínica Viver Bem', 'medium'], professional: ['Dr. Tiago Almeida (CRM-PR 34567)', 'high'],
    medications: [
      ['Amoxicilina', '500 mg', { kind: 'days', days: 7 }, '2026-11-02', 'high'],
      ['Losartana potássica', '50 mg', { kind: 'continuous' }, '2026-11-02', 'high'],
      ['Dipirona', '500 mg/mL', { kind: 'unknown' }, '2026-11-02', 'high'],
    ],
    warnings: [],
  },
  RENAL_HEPATICO_SANTA_CLARA: {
    patientName: ['Maria José Santos', 'high'], recordType: ['result', 'high'], title: ['Função renal e função hepática', 'medium'],
    date: ['2026-09-20', 'high'], location: ['Hospital Santa Clara', 'medium'], professional: ['Dr. André Luiz Carvalho (CRM-SP 112233)', 'high'],
    labs: [
      ['urea', 38, 'mg/dL', 15, 45, 'in', 'high'],
      ['creatinine', 0.92, 'mg/dL', 0.5, 1.1, 'in', 'high'],
      ['uric_acid', 6.3, 'mg/dL', 2.4, 5.7, 'high', 'high'],
      ['sodium', 139, 'mEq/L', 136, 145, 'in', 'high'],
      ['potassium', 4.8, 'mEq/L', 3.5, 5.1, 'in', 'high'],
      ['ast', 32, 'U/L', null, 32, 'in', 'high'],
      ['alt', 48, 'U/L', null, 33, 'high', 'high'],
      ['ggt', 41, 'U/L', 5, 36, 'high', 'high'],
      ['alkaline_phosphatase', 88, 'U/L', 35, 104, 'in', 'high'],
      ['bilirubin_total', 0.7, 'mg/dL', 0.3, 1.2, 'in', 'high'],
    ],
    warnings: [],
  },
  TIREOIDE_FERRO_LABVIDA: {
    patientName: ['Roberto Carlos Dias', 'high'], recordType: ['result', 'high'], title: ['Tireoide e ferro e vitaminas', 'medium'],
    date: ['2026-09-18', 'high'], location: ['Labvida Análises Clínicas', 'medium'], professional: ['Dr. Marcos Vieira (CRM-MG 87654)', 'high'],
    labs: [
      ['tsh', 3.1, 'µUI/mL', 0.27, 4.2, 'in', 'high'],
      ['free_t4', 1.05, 'ng/dL', 0.93, 1.7, 'in', 'high'],
      ['ferritin', 210, 'ng/mL', 30, 400, 'in', 'high'],
      ['iron', 92, 'µg/dL', 65, 175, 'in', 'high'],
      ['vitamin_b12', 640, 'pg/mL', 197, 771, 'in', 'high'],
    ],
    warnings: [],
  },
  URINA_HEMOGRAMA_VIDA_PLENA: {
    patientName: ['Lucas Moreira', 'high'], recordType: ['result', 'high'], title: ['Urina tipo I e hemograma', 'medium'],
    date: ['2026-08-15', 'high'], location: ['Laboratório Vida Plena', 'medium'], professional: ['Dra. Camila Rocha (CRM-BA 77889)', 'high'],
    labs: [
      ['urine_density', 1.02, '', 1.005, 1.03, 'in', 'high'],
      ['urine_ph', 6, '', 5, 7.5, 'in', 'high'],
      ['hemoglobin', 12.4, 'g/dL', 11.5, 15.5, 'in', 'high'],
      ['leukocytes', 7800, '/mm³', 4500, 13500, 'in', 'high'],
      ['platelets', 250000, '/mm³', 150000, 450000, 'in', 'high'],
    ],
    warnings: [],
  },
  VACINAS_ADULTO_SAO_JORGE: {
    patientName: ['Dirce Moreira', 'high'], recordType: ['vaccine', 'high'], title: ['Vacinas - Covid-19, Febre amarela e mais 1', 'medium'],
    date: ['2026-09-12', 'medium'], location: null, professional: null,
    vaccines: [
      ['covid19', 'R', 'Reforço', 'CVD2609X', '2026-09-12', null, 'high'],
      ['yellow_fever', 'DU', 'Dose única', 'VFA1188', '2025-02-03', null, 'high'],
      ['dt', 'R2', '2º reforço', 'DTA7712', '2026-05-20', null, 'high'],
    ],
    warnings: [],
  },
  VACINAS_IMUNIZAR: {
    patientName: ['Helena Moreira Dias', 'high'], recordType: ['vaccine', 'high'], title: ['Vacinas - Influenza, Meningocócica ACWY e mais 1', 'medium'],
    date: ['2026-04-15', 'medium'], location: ['Clínica Imunizar - Unidade Centro', 'high'], professional: null,
    vaccines: [
      ['influenza', 'DU', 'Dose única', 'FLU26A0412', '2026-04-15', 'Clínica Imunizar - Unidade Centro', 'high'],
      ['menacwy', 'D1', '1ª dose', 'MCW2603B', '2026-04-15', null, 'high'],
      ['hepatitis_a', 'D1', '1ª dose', 'HPA-5521', '2026-01-10', null, 'high'],
    ],
    warnings: [],
  },};

describe('parseHealthDocument — corpus de 20 textos fictícios', () => {
  it('tem 20 textos e uma saída esperada para cada', () => {
    expect(Object.keys(F)).toHaveLength(20);
    expect(Object.keys(EXPECTED).sort()).toEqual(Object.keys(F).sort());
  });

  it.each(Object.entries(EXPECTED))('%s', (name, exp) => {
    const r = parseHealthDocument(DOCS[name]!, { today: TODAY });
    expect(head(r.patientName)).toEqual(exp.patientName);
    expect(head(r.recordType)).toEqual(exp.recordType);
    expect(head(r.title)).toEqual(exp.title);
    expect(head(r.date)).toEqual(exp.date);
    expect(head(r.location)).toEqual(exp.location);
    expect(head(r.professional)).toEqual(exp.professional);
    expect(r.labResults.map((l) => [l.code, l.value, l.unit, l.referenceLow, l.referenceHigh, l.flag, l.confidence])).toEqual(exp.labs ?? []);
    expect(r.vaccines.map((v) => [v.vaccineCode, v.doseKey, v.doseLabel, v.lot, v.appliedOn, v.location, v.confidence])).toEqual(exp.vaccines ?? []);
    expect(r.medications.map((m) => [m.name, m.dosage, m.duration, m.startOn, m.confidence])).toEqual(exp.medications ?? []);
    expect(r.warnings.map((w) => w.code)).toEqual(exp.warnings);
  });

  it('é determinístico: o mesmo texto dá a mesma saída', () => {
    for (const text of Object.values(F)) {
      expect(parseHealthDocument(text, { today: TODAY })).toEqual(parseHealthDocument(text, { today: TODAY }));
    }
  });

  it('nunca usa "normal" como estado da faixa', () => {
    const flags = Object.values(F).flatMap((t) => parseHealthDocument(t, { today: TODAY }).labResults.map((l) => l.flag));
    expect(new Set(flags)).toEqual(new Set(['in', 'high', 'low', 'none']));
  });
});

describe('parseHealthDocument — faixas de referência', () => {
  it('creatinina usa a faixa do sexo do membro', () => {
    const pick = (sex: 'female' | 'male') =>
      parseHealthDocument(F.BIOQUIMICA_CERRADO, { today: TODAY, sex }).labResults.find((l) => l.code === 'creatinine');
    expect(pick('male')).toMatchObject({ referenceLow: 0.7, referenceHigh: 1.3, referenceText: '0,70 a 1,30 mg/dL', flag: 'in' });
    expect(pick('female')).toMatchObject({ referenceLow: 0.5, referenceHigh: 1.1, referenceText: '0,50 a 1,10 mg/dL', flag: 'in' });
  });

  it('mostra o texto da referência quando a faixa é ambígua', () => {
    const text = (doc: string, code: string) => parseHealthDocument(doc, { today: TODAY }).labResults.find((l) => l.code === code)?.referenceText;
    expect(text(F.BIOQUIMICA_CERRADO, 'hba1c')).toBe('Normal: inferior a 5,7 % Pré-diabetes: 5,7 a 6,4 % Diabetes: igual ou superior a 6,5 %');
    expect(text(F.BIOQUIMICA_CERRADO, 'creatinine')).toBe('Homens: 0,70 a 1,30 mg/dL Mulheres: 0,50 a 1,10 mg/dL');
    expect(text(F.LIPIDOS_TIREOIDE_SANTA_MONICA, 'ldl')).toBe('Baixo: < 130 mg/dL; Intermediário: < 100 mg/dL; Alto: < 70 mg/dL; Muito alto: < 50 mg/dL');
    expect(text(F.FOTO_SAO_LUCAS_OCR, 'vitamin_d')).toBe('Superior a 20 (populacao geral)  30 a 60 (grupos de risco)');
  });
});

describe('parseHealthDocument — casos de borda', () => {
  const one = (t: string, sex?: 'female' | 'male') => parseHealthDocument(t, { today: TODAY, sex });

  it('lê números no formato brasileiro', () => {
    expect(numberCandidates('10.000')).toEqual([10000, 10]);
    expect(numberCandidates('13,8')).toEqual([13.8]);
    expect(numberCandidates('1.234,5')).toEqual([1234.5]);
    expect(numberCandidates('1.020')).toEqual([1020, 1.02]);
    expect(one('Plaquetas: 250.000 /mm³').labResults[0]?.value).toBe(250000);
    expect(one('Hemoglobina: 13,2 g/dL').labResults[0]?.value).toBe(13.2);
  });

  it('F1.8: resultado censurado vira linha "Confira" sem valor', () => {
    const r = one('PCR: < 0,3 mg/dL');
    expect(r.labResults).toEqual([expect.objectContaining({ code: 'crp', value: null, unit: null, flag: 'none', confidence: 'low' })]);
    expect(r.warnings[0]?.code).toBe('value-censored');
  });

  it('F1.8: valor implausível (vírgula perdida) vira linha "Confira" sem valor', () => {
    const r = one('Hemoglobina: 138 g/dL (12,0 a 15,5)');
    expect(r.labResults).toEqual([expect.objectContaining({ code: 'hemoglobin', value: null, unit: null })]);
    expect(r.warnings[0]?.code).toBe('value-implausible');
  });

  it('F1.8: linha sem unidade vira "Confira" sem valor, mas guarda a faixa impressa', () => {
    const r = one('Hemoglobina 13,8  12,0 a 15,5');
    expect(r.labResults[0]).toMatchObject({ value: null, unit: null, confidence: 'low', referenceLow: 12, referenceHigh: 15.5, flag: 'none' });
    expect(r.warnings[0]?.code).toBe('unit-missing');
  });

  it('F1.8: a primeira leitura com valor substitui a linha "Confira" do mesmo analito', () => {
    const r = one('Hemoglobina: 8O g/dL\nHemoglobina: 13,1 g/dL');
    expect(r.labResults).toHaveLength(1);
    expect(r.labResults[0]).toMatchObject({ value: 13.1, unit: 'g/dL' });
  });

  it('não sugere parentes do analito (pós-prandial)', () => {
    expect(one('Glicose pós-prandial: 140 mg/dL (até 140)').labResults).toHaveLength(0);
  });

  it('unidade não convertível fica como impressa, com confiança baixa', () => {
    const r = one('Glicose: 5,5 mmol/L (3,9 a 5,5 mmol/L)');
    expect(r.labResults[0]).toMatchObject({ unit: 'mmol/L', confidence: 'low', flag: 'in' });
    expect(r.warnings[0]?.code).toBe('unit-not-convertible');
  });

  it('formatos de faixa da F1.7', () => {
    expect(one('Leucócitos: 10.000/mm³ (4.000 a 11.000/mm³)').labResults[0]).toMatchObject({ value: 10000, referenceLow: 4000 });
    expect(one('Colesterol total: 182 mg/dL Inferior a 190 mg/dL').labResults[0]).toMatchObject({ referenceHigh: 190, flag: 'in' });
    expect(one('Hemoglobina: 13,2 g/dL  13,0 – 17,0').labResults[0]).toMatchObject({ referenceLow: 13, referenceHigh: 17 });
    expect(one('Colesterol HDL: 38 mg/dL  > 40').labResults[0]).toMatchObject({ referenceLow: 40, flag: 'low' });
    expect(one('Glicose: 99 mg/dL  até 99').labResults[0]).toMatchObject({ referenceHigh: 99, flag: 'in' });
  });

  it('ponto ambíguo segue a convenção brasileira com confiança média', () => {
    expect(one('Ferritina: 1.200 ng/mL (13 a 150)').labResults[0]).toMatchObject({ value: 1200, confidence: 'medium', flag: 'high' });
  });

  it('faixa por sexo escolhe o segmento do membro', () => {
    const r = one('Hemoglobina: 14,1 g/dL  VR: Homens 13,5 a 17,5 / Mulheres 12,0 a 15,5', 'female');
    expect(r.labResults[0]).toMatchObject({ referenceLow: 12, referenceHigh: 15.5 });
  });

  it('ignora nascimento e data futura (F1.6)', () => {
    const r = one('Data de nascimento: 01/02/1990\nColetado em 31/12/2026');
    expect(r.date).toBeNull();
    expect(r.warnings[0]?.code).toBe('date-in-future');
  });

  it('F1.5: coleta vence liberação, e sem rótulo vale a mais recente', () => {
    expect(one('Liberado em 13/03/2026\nColetado em: 12/03/2026').date).toMatchObject({ value: '2026-03-12', confidence: 'high' });
    expect(one('Emitido em 10/03/2026\nData: 01/03/2026').date).toMatchObject({ value: '2026-03-10', confidence: 'medium' });
    expect(one('Consulta 01/02/2026\nRetorno 15/03/2026').date).toMatchObject({ value: '2026-03-15', confidence: 'low' });
  });

  it('findDates: dois dígitos, por extenso e data inexistente', () => {
    expect(findDates('28/10/26', TODAY).map((d) => d.iso)).toEqual(['2026-10-28']);
    expect(findDates('12/03/98', TODAY).map((d) => d.iso)).toEqual(['1998-03-12']);
    expect(findDates('5 de outubro de 2026', TODAY).map((d) => d.iso)).toEqual(['2026-10-05']);
    expect(findDates('12 mar 2026', TODAY).map((d) => d.iso)).toEqual(['2026-03-12']);
    expect(findDates('31/02/2026', TODAY)).toEqual([]);
  });

  it('lê a duração da receita', () => {
    expect(readDuration('tomar por 10 dias')).toEqual({ kind: 'days', days: 10 });
    expect(readDuration('durante duas semanas')).toEqual({ kind: 'days', days: 14 });
    expect(readDuration('por 1 mes')).toEqual({ kind: 'days', days: 30 });
    expect(readDuration('uso continuo')).toEqual({ kind: 'continuous' });
    expect(readDuration('se dor')).toEqual({ kind: 'unknown' });
    // R6 mora na entity; o parser só lê a duração.
    expect(medicationEndOn('2026-11-02', readDuration('por 7 dias'))).toBe('2026-11-08');
    expect(medicationEndOn('2026-11-02', readDuration('uso continuo'))).toBeNull();
    expect(medicationEndOn('2026-11-02', readDuration('se febre'))).toBeUndefined();
  });

  it('lê a dose da vacina com a chave do calendário', () => {
    expect(readDose('dose unica')).toEqual({ key: 'DU', label: 'Dose única' });
    expect(readDose('1a dose')).toEqual({ key: 'D1', label: '1ª dose' });
    expect(readDose('segunda dose')).toEqual({ key: 'D2', label: '2ª dose' });
    expect(readDose('dose 3')).toEqual({ key: 'D3', label: '3ª dose' });
    expect(readDose('4ª dose')).toEqual({ key: 'OUTRA', label: '4ª dose' });
    expect(readDose('reforco')).toEqual({ key: 'R', label: 'Reforço' });
    expect(readDose('1º reforco')).toEqual({ key: 'R1', label: '1º reforço' });
    expect(readDose('dose anual')).toEqual({ key: 'ANUAL', label: 'Dose anual' });
    expect(readDose('aplicada')).toBeNull();
  });

  it('lê o paciente só da linha rotulada', () => {
    expect(one('Paciente: Ana Beatriz Moreira   Data de nascimento: 14/02/1988').patientName?.value).toBe('Ana Beatriz Moreira');
    expect(one('Nome: Lucas Moreira (7 anos)').patientName?.value).toBe('Lucas Moreira');
    expect(one('Hemoglobina: 13,1 g/dL').patientName).toBeNull();
  });

  it('computeFlag é inclusivo e texto vazio não sugere nada', () => {
    expect(computeFlag(32, null, 32)).toBe('in');
    expect(computeFlag(5, null, null)).toBe('none');
    const empty = parseHealthDocument('', { today: TODAY });
    expect(empty.recordType).toBeNull();
    expect(empty.patientName).toBeNull();
    expect(empty.labResults).toEqual([]);
  });
});
