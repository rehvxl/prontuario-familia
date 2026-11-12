/** Unidade exibida → por extenso, para o leitor de tela (MetricValue.unitSpoken). Cobre as unidades do catálogo e as aceitas. */
const SPOKEN_UNITS: Readonly<Record<string, string>> = {
  '%': 'por cento',
  'g/dL': 'gramas por decilitro',
  'g/L': 'gramas por litro',
  'mg/dL': 'miligramas por decilitro',
  'mg/L': 'miligramas por litro',
  'µg/dL': 'microgramas por decilitro',
  'µg/L': 'microgramas por litro',
  'ng/dL': 'nanogramas por decilitro',
  'ng/mL': 'nanogramas por mililitro',
  'ng/L': 'nanogramas por litro',
  'pg/mL': 'picogramas por mililitro',
  pg: 'picogramas',
  fL: 'fentolitros',
  'µ³': 'micrômetros cúbicos',
  'µUI/mL': 'microunidades internacionais por mililitro',
  'mUI/L': 'miliunidades internacionais por litro',
  'U/L': 'unidades por litro',
  'UI/L': 'unidades internacionais por litro',
  'mEq/L': 'miliequivalentes por litro',
  'mmol/L': 'milimols por litro',
  '/mm³': 'por milímetro cúbico',
  '/µL': 'por microlitro',
  'mil/mm³': 'mil por milímetro cúbico',
  'mil/µL': 'mil por microlitro',
  '10³/µL': 'mil por microlitro',
  'milhões/mm³': 'milhões por milímetro cúbico',
  'milhões/µL': 'milhões por microlitro',
  '10⁶/µL': 'milhões por microlitro',
  'mL/min/1,73m²': 'mililitros por minuto por 1,73 metro quadrado',
  mmHg: 'milímetros de mercúrio',
  kg: 'quilogramas',
  cm: 'centímetros',
  m: 'metros',
};

/** Singular das palavras antes de "por"/"de": "microunidades internacionais" → "microunidade internacional", "milhões" → "milhão". */
const singular = (spoken: string) => {
  const words = spoken.split(' ');
  const stop = words.findIndex((w) => w === 'por' || w === 'de');
  return words
    .map((w, i) => (stop !== -1 && i >= stop ? w : w.replace(/ões$/, 'ão').replace(/ais$/, 'al').replace(/s$/, '')))
    .join(' ');
};

/**
 * 'mg/dL' → 'miligramas por decilitro'; com `value` 1, no singular ('miligrama por decilitro').
 * Unidade desconhecida volta como veio (o leitor lê a sigla).
 */
export function spokenUnit(unit: string, value?: number): string {
  const spoken = SPOKEN_UNITS[unit];
  if (!spoken) return unit;
  return value === 1 ? singular(spoken) : spoken;
}
