// B1 da validação em aparelho: o Vision leu glicose e HbA1c, mas deixou a creatinina "1,0" como "Confira".
// Causa: a correção de idioma do Vision troca dígito por letra dentro do decimal ("1,O", "l,0") ou solta espaço na
// vírgula ("1 ,0"); o número parava no "1" e o resto (",O mg/dL") não era unidade → unit-missing → "Confira".
import { LAUDO_SANTA_CLARA_VISION } from './__fixtures__/vision';
import { parseHealthDocument } from './parse-health-document';

const parse = (text: string) => parseHealthDocument(text, { today: '2026-11-11' });
const row = (text: string, code: string) => parse(text).labResults.find((l) => l.code === code);
const lab = (r: ReturnType<typeof row>) => r && [r.value, r.unit, r.referenceLow, r.referenceHigh, r.flag, r.confidence];
const creatinine = (line: string) => LAUDO_SANTA_CLARA_VISION.replace('Resultado: 1,0 mg/dL', line);

describe('laudo Santa Clara lido pelo Vision', () => {
  it('lê os quatro exames com valor, unidade e faixa', () => {
    const r = parse(LAUDO_SANTA_CLARA_VISION);
    expect(r.labResults.map((l) => [l.code, ...lab(l)!])).toEqual([
      ['hba1c', 7.1, '%', null, 5.7, 'high', 'high'],
      ['glucose_fasting', 131, 'mg/dL', 70, 99, 'high', 'high'],
      ['creatinine', 1, 'mg/dL', 0.7, 1.3, 'in', 'high'],
      ['cholesterol_total', 182, 'mg/dL', null, 190, 'in', 'high'],
    ]);
    expect(r.warnings).toEqual([]);
    expect(r.date).toMatchObject({ value: '2026-11-04' });
  });

  it.each(['Resultado: 1.0 mg/dL', 'Resultado: 1,0mg/dL', 'Resultado:   1,0   mg/dL', 'Resultado: 1,0 mg / dL', 'Resultado 1,0 mg/dl'])(
    'variação sem troca de caractere: "%s" → 1 mg/dL, confiança alta',
    (line) => expect(lab(row(creatinine(line), 'creatinine'))).toEqual([1, 'mg/dL', 0.7, 1.3, 'in', 'high']),
  );

  it.each(['Resultado: 1,O mg/dL', 'Resultado: 1,o mg/dL', 'Resultado: l,0 mg/dL', 'Resultado: I,0 mg/dL', 'Resultado: 1 ,0 mg/dL', 'Resultado: 1, 0 mg/dL', 'Resultado: 1,Omg/dL'])(
    'letra no lugar do dígito ou espaço na vírgula: "%s" → 1 mg/dL, confiança média (a pessoa confere)',
    (line) => expect(lab(row(creatinine(line), 'creatinine'))).toEqual([1, 'mg/dL', 0.7, 1.3, 'in', 'medium']),
  );

  it('"Resultado:" sozinho na linha: o valor vem na linha de baixo', () => {
    expect(lab(row(creatinine('Resultado:\n1,0 mg/dL'), 'creatinine'))).toEqual([1, 'mg/dL', 0.7, 1.3, 'in', 'high']);
  });

  it('unidade sozinha na linha de baixo: ainda é a unidade do valor, e a faixa continua lida', () => {
    expect(lab(row(creatinine('Resultado: 1,0\nmg/dL'), 'creatinine'))).toEqual([1, 'mg/dL', 0.7, 1.3, 'in', 'high']);
  });

  it('não adivinha fora do decimal: inteiro grudado em letra ("8O") segue "Confira" (F1.8); sem dígito real, não há valor', () => {
    expect(row(creatinine('Resultado: 8O mg/dL'), 'creatinine')).toMatchObject({ value: null, confidence: 'low' });
    expect(row(creatinine('Resultado: l,o mg/dL'), 'creatinine')?.value ?? null).toBeNull();
    // ponto final de frase seguido de palavra não vira decimal
    expect(row('Glicose 92. Ok mg/dL', 'glucose_fasting')?.value ?? null).toBeNull();
  });
});

// Saída real do Apple Vision (macOS, .accurate, pt-BR, correção de idioma) para o laudo fictício Santa Clara:
// a unidade da creatinina veio "mg/aL" e o "%" da HbA1c colou no número ("7,1%").
describe('unidade trocada pelo Vision no denominador', () => {
  it('"Resultado: 1,0 mg/aL" vira 1 mg/dL', () => {
    expect(lab(row(creatinine('Resultado: 1,0 mg/aL'), 'creatinine'))).toEqual([1, 'mg/dL', 0.7, 1.3, 'in', 'high']);
  });

  it.each(['mg/dI', 'mg/d1', 'mg/dl'])('"%s" vira mg/dL', (u) => {
    expect(row(creatinine(`Resultado: 1,0 ${u}`), 'creatinine')?.unit).toBe('mg/dL');
  });

  it('"7,1%" colado lê a HbA1c', () => {
    expect(row(LAUDO_SANTA_CLARA_VISION.replace('Resultado: 7,1 %', 'Resultado: 7,1%'), 'hba1c')?.value).toBe(7.1);
  });

  it('não inventa unidade fora do denominador ("ag/dL" continua sem unidade)', () => {
    expect(row(creatinine('Resultado: 1,0 ag/dL'), 'creatinine')?.unit ?? null).toBeNull();
  });
});
