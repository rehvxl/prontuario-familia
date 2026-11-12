import { ANALYTES, GROUP_TITLES, UNIT_ALIASES, VITALS, findAnalyte } from './analyte-catalog';
import { spokenUnit } from './spoken-unit';

describe('catálogo de analitos (Apêndice B.1)', () => {
  // O texto do ocr-tecnico.md diz 36, mas o bloco canônico do Apêndice B.1 (e a tabela do §d) tem 37 códigos.
  it('tem os 37 analitos do Apêndice B.1, com códigos únicos e o free_t4', () => {
    expect(ANALYTES).toHaveLength(37);
    expect(new Set(ANALYTES.map((a) => a.code)).size).toBe(37);
    expect(findAnalyte('free_t4')?.label).toBe('T4 livre');
    expect(findAnalyte('t4_free')).toBeUndefined();
  });

  it('todo grupo tem título e toda unidade aceita inclui a canônica', () => {
    for (const a of ANALYTES) {
      expect(GROUP_TITLES[a.group]).toBeTruthy();
      expect(a.accepts[a.unit]).toBe(1);
    }
  });

  it('as unidades dos aliases são as exibidas no catálogo', () => {
    const units = new Set(ANALYTES.flatMap((a) => Object.keys(a.accepts)));
    for (const shown of Object.values(UNIT_ALIASES)) expect(units.has(shown)).toBe(true);
  });

  it('todo analito e sinal vital tem casas decimais de exibição', () => {
    for (const a of [...ANALYTES, ...VITALS]) expect(Number.isInteger(a.decimals) && a.decimals >= 0 && a.decimals <= 3).toBe(true);
  });

  it('sinais vitais com unidade fixa', () => {
    expect(VITALS.map((v) => `${v.code} ${v.unit}`)).toEqual(['bp mmHg', 'glucose_capillary mg/dL', 'weight kg', 'height cm']);
  });
});

describe('spokenUnit', () => {
  it('lê por extenso', () => {
    expect(spokenUnit('mg/dL')).toBe('miligramas por decilitro');
    expect(spokenUnit('%')).toBe('por cento');
    expect(spokenUnit('mmHg')).toBe('milímetros de mercúrio');
  });

  it('cobre toda unidade do catálogo e dos sinais vitais', () => {
    const units = [...ANALYTES.flatMap((a) => Object.keys(a.accepts)), ...VITALS.map((v) => v.unit)].filter((u) => u !== '');
    for (const unit of units) expect(spokenUnit(unit)).not.toBe(unit);
  });

  it('unidade desconhecida volta igual', () => {
    expect(spokenUnit('xyz')).toBe('xyz');
    expect(spokenUnit('')).toBe('');
    expect(spokenUnit('xyz', 1)).toBe('xyz');
  });

  it('concorda no singular quando o valor é 1', () => {
    expect(spokenUnit('mg/dL', 1)).toBe('miligrama por decilitro');
    expect(spokenUnit('kg', 1)).toBe('quilograma');
    expect(spokenUnit('µUI/mL', 1)).toBe('microunidade internacional por mililitro');
    expect(spokenUnit('UI/L', 1)).toBe('unidade internacional por litro');
    expect(spokenUnit('milhões/mm³', 1)).toBe('milhão por milímetro cúbico');
    expect(spokenUnit('µ³', 1)).toBe('micrômetro cúbico');
    expect(spokenUnit('mmHg', 1)).toBe('milímetro de mercúrio');
    expect(spokenUnit('mmol/L', 1)).toBe('milimol por litro');
    expect(spokenUnit('mL/min/1,73m²', 1)).toBe('mililitro por minuto por 1,73 metro quadrado');
    // sem palavra no plural antes do "por": não muda
    expect(spokenUnit('%', 1)).toBe('por cento');
    expect(spokenUnit('/mm³', 1)).toBe('por milímetro cúbico');
    expect(spokenUnit('mil/mm³', 1)).toBe('mil por milímetro cúbico');
  });

  it('fica no plural para qualquer outro valor', () => {
    expect(spokenUnit('mg/dL', 1.08)).toBe('miligramas por decilitro');
    expect(spokenUnit('mg/dL', 0)).toBe('miligramas por decilitro');
    expect(spokenUnit('kg', 2)).toBe('quilogramas');
  });
});
