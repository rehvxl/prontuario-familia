import { buildSeries, latestOutOfRange, seriesKey, vitalSeries } from './series';
import type { Measurement } from './types';

let seq = 0;
const lab = (over: Partial<Measurement> = {}): Measurement => {
  seq += 1;
  return {
    id: `x${seq}`,
    familyId: 'f1',
    memberId: 'm1',
    kind: 'lab',
    code: 'hba1c',
    label: 'Hemoglobina glicada (HbA1c)',
    value: 6,
    value2: null,
    unit: '%',
    referenceLow: null,
    referenceHigh: null,
    referenceText: null,
    takenOn: '2026-10-01',
    takenAt: null,
    context: null,
    note: null,
    sourceRecordId: null,
    origin: 'manual',
    createdAt: `2026-11-01T00:00:${String(seq).padStart(2, '0')}Z`,
    updatedAt: '2026-11-01T00:00:00Z',
    ...over,
  };
};
const vital = (over: Partial<Measurement> = {}) => lab({ kind: 'vital', code: 'weight', label: 'Peso', unit: 'kg', ...over });

describe('seriesKey (R2)', () => {
  it('usa o code do catálogo', () => {
    expect(seriesKey({ code: 'hba1c', label: 'Qualquer' })).toBe('hba1c');
  });

  it('em "other", normaliza o rótulo (caixa, acento e espaços)', () => {
    expect(seriesKey({ code: 'other', label: '  Homocisteína   Total ' })).toBe('homocisteina total');
    expect(seriesKey({ code: 'other', label: 'HOMOCISTEINA total' })).toBe('homocisteina total');
  });
});

describe('buildSeries (R2–R4)', () => {
  it('agrupa por série, ordena por data e hora, e ignora sinais vitais', () => {
    const series = buildSeries([
      lab({ id: 'c', takenOn: '2026-10-01', takenAt: '09:00' }),
      lab({ id: 'a', takenOn: '2025-04-10' }),
      lab({ id: 'b', takenOn: '2026-10-01', takenAt: '08:00' }),
      lab({ id: 'o1', code: 'other', label: 'Homocisteína', unit: 'µmol/L', takenOn: '2026-01-01' }),
      lab({ id: 'o2', code: 'other', label: 'homocisteina ', unit: 'µmol/L', takenOn: '2026-02-01' }),
      vital({ id: 'v' }),
    ]);
    expect(series.map((s) => s.key)).toEqual(['hba1c', 'homocisteina']);
    expect(series[0]!.points.map((m) => m.id)).toEqual(['a', 'b', 'c']);
    expect(series[0]!.latest.id).toBe('c');
    expect(series[1]!.points.map((m) => m.id)).toEqual(['o1', 'o2']);
    expect(series[1]!.label).toBe('homocisteina ');
  });

  it('sem hora vem antes da medição com hora no mesmo dia', () => {
    const [s] = buildSeries([lab({ id: 'h', takenAt: '07:30' }), lab({ id: 'n', takenAt: null })]);
    expect(s!.points.map((m) => m.id)).toEqual(['n', 'h']);
  });

  it('R3: gráfico só com a unidade do mais recente; o resto fica fora do gráfico', () => {
    const [s] = buildSeries([
      lab({ id: 'old', code: 'glucose_fasting', unit: 'mmol/L', value: 5.5, takenOn: '2025-01-01' }),
      lab({ id: 'p1', code: 'glucose_fasting', unit: 'mg/dL', value: 95, takenOn: '2025-06-01' }),
      lab({ id: 'p2', code: 'glucose_fasting', unit: 'mg/dL', value: 101, takenOn: '2026-06-01' }),
    ]);
    expect(s!.unit).toBe('mg/dL');
    expect(s!.chart.map((m) => m.id)).toEqual(['p1', 'p2']);
    expect(s!.offChart.map((m) => m.id)).toEqual(['old']);
  });

  it('R3: um ponto só fica no gráfico (a tela decide mostrar com ≥ 2)', () => {
    const [s] = buildSeries([lab({ id: 'u' })]);
    expect(s!.chart).toHaveLength(1);
    expect(s!.offChart).toEqual([]);
  });

  it('R4: banda quando todos os pontos do gráfico têm a mesma faixa', () => {
    const [s] = buildSeries([
      lab({ takenOn: '2025-01-01', referenceLow: 4, referenceHigh: 5.6 }),
      lab({ takenOn: '2026-01-01', referenceLow: 4, referenceHigh: 5.6 }),
    ]);
    expect(s!.band).toEqual({ low: 4, high: 5.6 });
  });

  it('R4: sem banda se as faixas diferem, se falta um limite ou se a diferença está só fora do gráfico', () => {
    const differ = buildSeries([lab({ takenOn: '2025-01-01', referenceLow: 4, referenceHigh: 5.6 }), lab({ takenOn: '2026-01-01', referenceLow: 4, referenceHigh: 5.7 })]);
    expect(differ[0]!.band).toBeNull();
    const onlyHigh = buildSeries([lab({ takenOn: '2025-01-01', referenceHigh: 5.6 }), lab({ takenOn: '2026-01-01', referenceHigh: 5.6 })]);
    expect(onlyHigh[0]!.band).toBeNull();
    const offChart = buildSeries([
      lab({ takenOn: '2024-01-01', unit: 'mmol/mol', referenceLow: 20, referenceHigh: 42 }),
      lab({ takenOn: '2025-01-01', referenceLow: 4, referenceHigh: 5.6 }),
      lab({ takenOn: '2026-01-01', referenceLow: 4, referenceHigh: 5.6 }),
    ]);
    expect(offChart[0]!.band).toEqual({ low: 4, high: 5.6 });
  });

  it('séries do resultado mais recente para o mais antigo', () => {
    const series = buildSeries([lab({ code: 'tsh', label: 'TSH', takenOn: '2026-03-01' }), lab({ code: 'hdl', label: 'Colesterol HDL', takenOn: '2026-09-01' })]);
    expect(series.map((s) => s.code)).toEqual(['hdl', 'tsh']);
  });
});

describe('latestOutOfRange (R15), hoje = 2026-11-11', () => {
  const today = '2026-11-11';

  it('conta só o resultado mais recente de cada série', () => {
    const out = latestOutOfRange(
      [
        lab({ id: 'old-high', takenOn: '2026-01-01', value: 7.4, referenceHigh: 5.6 }),
        lab({ id: 'new-in', takenOn: '2026-10-01', value: 5.4, referenceHigh: 5.6 }),
        lab({ id: 'hdl-low', code: 'hdl', label: 'Colesterol HDL', takenOn: '2026-10-28', value: 38, referenceLow: 40 }),
        lab({ id: 'ldl-text', code: 'ldl', label: 'Colesterol LDL', takenOn: '2026-10-28', value: 120, referenceText: 'Desejável: < 100' }),
      ],
      today,
    );
    expect(out.map((m) => m.id)).toEqual(['hdl-low']);
  });

  it('janela de 12 meses: 11/11/2025 entra, 10/11/2025 não', () => {
    const inWindow = lab({ id: 'in', takenOn: '2025-11-11', value: 101, referenceLow: 70, referenceHigh: 99, code: 'glucose_fasting' });
    const outWindow = lab({ id: 'out', takenOn: '2025-11-10', value: 101, referenceLow: 70, referenceHigh: 99, code: 'tsh' });
    expect(latestOutOfRange([inWindow, outWindow], today).map((m) => m.id)).toEqual(['in']);
  });

  it('valor igual ao limite não conta; sinais vitais nunca contam (S3)', () => {
    const out = latestOutOfRange(
      [lab({ value: 99, referenceLow: 70, referenceHigh: 99, code: 'glucose_fasting' }), vital({ code: 'bp', value: 190, value2: 120 })],
      today,
    );
    expect(out).toEqual([]);
  });

  it('em 29/02 a janela começa em 28/02 do ano anterior', () => {
    const m = lab({ takenOn: '2027-02-28', value: 9, referenceHigh: 5.6 });
    expect(latestOutOfRange([m], '2028-02-29')).toHaveLength(1);
    expect(latestOutOfRange([{ ...m, takenOn: '2027-02-27' }], '2028-02-29')).toHaveLength(0);
  });
});

describe('vitalSeries', () => {
  it('filtra o código pedido, só vitais, em ordem cronológica', () => {
    const ms = [
      vital({ id: 'w2', takenOn: '2026-11-10', takenAt: '08:00' }),
      vital({ id: 'w1', takenOn: '2026-11-01', takenAt: '20:00' }),
      vital({ id: 'h', code: 'height', unit: 'cm' }),
      lab({ id: 'l', code: 'weight' }),
    ];
    expect(vitalSeries(ms, 'weight').map((m) => m.id)).toEqual(['w1', 'w2']);
  });
});
