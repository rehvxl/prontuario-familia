import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/shared/ui';
import type { Measurement } from '../domain/types';
import { MeasurementRow } from './MeasurementRow';
import { measurementOriginText, measurementValueText, referenceRangeText } from './format';

const lab = (over: Partial<Measurement>): Measurement => ({
  id: 'm1',
  familyId: 'fam',
  memberId: 'carlos',
  kind: 'lab',
  code: 'glucose_fasting',
  label: 'Glicose em jejum',
  value: 99,
  value2: null,
  unit: 'mg/dL',
  referenceLow: 70,
  referenceHigh: 99,
  referenceText: null,
  takenOn: '2026-10-12',
  takenAt: null,
  context: null,
  note: null,
  sourceRecordId: null,
  origin: 'manual',
  createdAt: '2026-10-12T10:00:00.000Z',
  updatedAt: '2026-10-12T10:00:00.000Z',
  ...over,
});

const renderRow = (m: Measurement, onPress?: () => void) =>
  render(
    <ThemeProvider scheme="light" reducedMotion>
      <MeasurementRow measurement={m} origin="Registrado por você" onPress={onPress} testID="row" />
    </ThemeProvider>,
  );

describe('MeasurementRow — estado R1 em texto (spec F2.4)', () => {
  it.each([
    ['glicose 99 com faixa 70–99', lab({ value: 99 }), 'Dentro da faixa do laudo'],
    ['glicose 100 com faixa 70–99', lab({ value: 100 }), 'Acima da faixa do laudo'],
    ['glicose 69,9 com faixa 70–99', lab({ value: 69.9 }), 'Abaixo da faixa do laudo'],
    ['HDL 38 com "> 40"', lab({ code: 'hdl', label: 'Colesterol HDL', value: 38, referenceLow: 40, referenceHigh: null }), 'Abaixo da faixa do laudo'],
    ['LDL 120 só com texto "Desejável: < 100"', lab({ code: 'ldl', label: 'Colesterol LDL', value: 120, referenceLow: null, referenceHigh: null, referenceText: 'Desejável: < 100' }), 'Sem faixa no laudo'],
  ])('%s → %s', async (_case, m, text) => {
    await renderRow(m);
    expect(screen.getByText(text)).toBeTruthy();
  });

  it('mostra rótulo, valor e unidade, data abreviada, faixa do laudo e origem', async () => {
    await renderRow(lab({ value: 100 }));
    expect(screen.getByText('Glicose em jejum')).toBeTruthy();
    expect(screen.getByText('100')).toBeTruthy();
    expect(screen.getByText('mg/dL')).toBeTruthy();
    expect(screen.getByText('Faixa do laudo: 70–99 mg/dL · 12 de out. de 2026')).toBeTruthy();
    expect(screen.getByText('Registrado por você')).toBeTruthy();
  });

  it('é um botão só para o leitor de tela, com a unidade por extenso e o estado', async () => {
    const onPress = jest.fn();
    await renderRow(lab({ value: 100 }), onPress);
    const row = screen.getByRole('button', {
      name: 'Glicose em jejum, 100 miligramas por decilitro, acima da faixa do laudo, faixa do laudo 70–99 mg/dL, 12 de out. de 2026, Registrado por você',
    });
    await fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('mostra as casas do laudo (creatinina 1 → "1,0") e lê a unidade no singular', async () => {
    await renderRow(lab({ code: 'creatinine', label: 'Creatinina', value: 1, referenceLow: 0.7, referenceHigh: 1.3 }), jest.fn());
    expect(screen.getByText('1,0')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Creatinina, 1,0 miligrama por decilitro, dentro da faixa do laudo,/ })).toBeTruthy();
  });
});

describe('textos do resultado', () => {
  it('formata valor, faixa e origem em pt-BR (S5)', () => {
    expect(measurementValueText(lab({ value: 7.4, unit: '%' }))).toBe('7,4 %');
    expect(measurementValueText(lab({ value: 1.02, unit: '' }))).toBe('1,02');
    expect(measurementValueText(lab({ code: 'creatinine', value: 1, unit: 'mg/dL' }))).toBe('1,0 mg/dL');
    expect(referenceRangeText(lab({ referenceLow: 13, referenceHigh: 17.5, unit: 'g/dL' }))).toBe('13–17,5 g/dL');
    expect(referenceRangeText(lab({ referenceLow: null, referenceHigh: 5.7, unit: '%' }))).toBe('até 5,7 %');
    expect(referenceRangeText(lab({ referenceLow: 40, referenceHigh: null }))).toBe('a partir de 40 mg/dL');
    expect(referenceRangeText(lab({ referenceText: 'Desejável: < 190' }))).toBe('Desejável: < 190');
    expect(referenceRangeText(lab({ referenceLow: null, referenceHigh: null }))).toBeNull();
    expect(measurementOriginText(lab({}))).toBe('Registrado por você');
    expect(measurementOriginText(lab({ sourceRecordId: 'r1' }), { title: 'Hemograma completo', date: '2026-10-12' })).toBe('Do documento Hemograma completo, 12 de out. de 2026');
  });
});
