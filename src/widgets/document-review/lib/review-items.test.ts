import type { HealthDocumentSuggestions } from '@/features/read-document';
import { countSelected, createReviewItems, suggestedLabValue, toHealthData } from './review-items';

const suggestions: Pick<HealthDocumentSuggestions, 'labResults' | 'vaccines' | 'medications'> = {
  labResults: [
    { code: 'hba1c', label: 'Hemoglobina glicada', rawName: 'HbA1c', value: 7.4, unit: '%', referenceLow: null, referenceHigh: 5.7, referenceText: 'inferior a 5,7 %', flag: 'high', confidence: 'high', evidence: 'HbA1c 7,4 %' },
    { code: 'glucose_fasting', label: 'Glicose em jejum', rawName: 'Glicose', value: null, unit: null, referenceLow: null, referenceHigh: null, referenceText: null, flag: 'none', confidence: 'low', evidence: 'Glicose 104' },
  ],
  vaccines: [
    { vaccineCode: 'influenza', name: 'Influenza', rawName: 'Influenza', doseKey: null, doseLabel: null, lot: null, appliedOn: null, location: null, confidence: 'medium', evidence: 'Influenza' },
  ],
  medications: [
    { name: 'Losartana', dosage: '50 mg', instructions: null, duration: { kind: 'unknown' }, startOn: null, confidence: 'high', evidence: 'Losartana 50 mg' },
  ],
};
const ctx = { familyId: 'f1', memberId: 'm1', recordDate: '2026-11-03', today: '2026-11-11' };

describe('review-items', () => {
  it('cria todos os itens desmarcados, com o valor em pt-BR e a linha "Confira" vazia (S4, F1.8)', () => {
    const items = createReviewItems(suggestions);
    expect(items.map((i) => i.selected)).toEqual([false, false, false, false]);
    expect(countSelected(items)).toBe(0);
    expect(items[0]).toMatchObject({ value: '7,4', unit: '%' });
    expect(items[1]).toMatchObject({ value: '', unit: '' });
    expect(toHealthData(items, ctx)).toEqual({ data: { measurements: [], vaccineDoses: [], medications: [] }, errors: {} });
  });

  it('converte só os marcados; dose sem chave vira "Outra dose" e medicamento sem duração pede a escolha', () => {
    const items = createReviewItems(suggestions).map((i) => (i.group === 'lab' && i.id === 'lab-1' ? i : { ...i, selected: true }));
    const { data, errors } = toHealthData(items, ctx);
    expect(data.measurements).toMatchObject([{ code: 'hba1c', value: 7.4, unit: '%', referenceHigh: 5.7, takenOn: '2026-11-03' }]);
    expect(data.vaccineDoses).toMatchObject([{ vaccineCode: 'influenza', doseKey: 'OUTRA', appliedOn: null }]);
    expect(errors).toEqual({ 'medication-0': 'Escolha por quanto tempo.' });

    const chosen = items.map((i) => (i.group === 'medication' ? { ...i, plan: { kind: 'continuous' as const } } : i));
    expect(toHealthData(chosen, ctx).data.medications).toMatchObject([{ name: 'Losartana', startOn: '2026-11-03', endOn: null }]);
  });

  it('valor lido com as casas do analito: creatinina 1 → "1,0" (C4), e "1,0" volta a 1 ao salvar', () => {
    const creatinine = { ...suggestions.labResults[0]!, code: 'creatinine', label: 'Creatinina', value: 1, unit: 'mg/dL', referenceHigh: 1.3, referenceText: null, flag: 'in' as const };
    expect(suggestedLabValue(creatinine)).toBe('1,0');
    expect(suggestedLabValue({ ...creatinine, value: 1.08 })).toBe('1,08');
    expect(suggestedLabValue({ ...creatinine, value: null })).toBe('');
    const [item] = createReviewItems({ labResults: [creatinine], vaccines: [], medications: [] });
    expect(item).toMatchObject({ value: '1,0' });
    expect(toHealthData([{ ...item!, selected: true }], ctx).data.measurements).toMatchObject([{ code: 'creatinine', value: 1 }]);
  });
});
