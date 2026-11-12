import { formatMeasurementValue as fmt } from './format-value';

describe('formatMeasurementValue', () => {
  it('completa as casas usuais do analito (o laudo diz "1,0 mg/dL")', () => {
    expect(fmt({ code: 'creatinine', value: 1, unit: 'mg/dL' })).toBe('1,0');
    expect(fmt({ code: 'hba1c', value: 7, unit: '%' })).toBe('7,0');
    expect(fmt({ code: 'hemoglobin', value: 13, unit: 'g/dL' })).toBe('13,0');
    expect(fmt({ code: 'tsh', value: 3.1, unit: 'µUI/mL' })).toBe('3,10');
    expect(fmt({ code: 'urine_density', value: 1.02, unit: '' })).toBe('1,020');
    expect(fmt({ code: 'glucose_fasting', value: 131, unit: 'mg/dL' })).toBe('131');
    expect(fmt({ code: 'cholesterol_total', value: 182, unit: 'mg/dL' })).toBe('182');
  });

  it('nunca corta as casas que o número já tem', () => {
    expect(fmt({ code: 'creatinine', value: 1.08, unit: 'mg/dL' })).toBe('1,08');
    expect(fmt({ code: 'glucose_fasting', value: 92.5, unit: 'mg/dL' })).toBe('92,5');
  });

  it('agrupa milhar em pt-BR', () => {
    expect(fmt({ code: 'platelets', value: 250000, unit: '/mm³' })).toBe('250.000');
    expect(fmt({ code: 'leukocytes', value: 6800, unit: '/mm³' })).toBe('6.800');
  });

  it('sinais vitais: peso 1 casa, altura 0 em cm e 2 em m, pressão e glicemia inteiras', () => {
    expect(fmt({ code: 'weight', value: 72, unit: 'kg' })).toBe('72,0');
    expect(fmt({ code: 'height', value: 170, unit: 'cm' })).toBe('170');
    expect(fmt({ code: 'height', value: 1.7, unit: 'm' })).toBe('1,70');
    expect(fmt({ code: 'bp', value: 120, unit: 'mmHg' })).toBe('120');
    expect(fmt({ code: 'glucose_capillary', value: 98, unit: 'mg/dL' })).toBe('98');
  });

  it("'other' e código desconhecido: as casas do próprio número", () => {
    expect(fmt({ code: 'other', value: 1, unit: 'mg/dL' })).toBe('1');
    expect(fmt({ code: 'other', value: 4.25, unit: 'U/mL' })).toBe('4,25');
    expect(fmt({ code: 'xyz', value: 1200.5, unit: '' })).toBe('1.200,5');
  });
});
