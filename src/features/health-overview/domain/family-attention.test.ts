import type { AttentionKind } from './family-attention';
import { buildFamilyAttention } from './family-attention';
import { TODAY, UP_TO_DATE_DOSES, dose, lab, member } from './__fixtures__/health';

const KIND_ORDER: AttentionKind[] = ['vaccine-late', 'lab-out-of-range', 'vaccine-due', 'vaccine-next'];

const lia = member('lia', 'Lia Souza', '2026-01-10'); // 10 meses
const carlos = member('carlos', 'Carlos Souza', '1996-01-01'); // 30 anos
const dirce = member('dirce', 'Dirce Souza', '1950-05-05'); // 76 anos
const ana = member('ana', 'Ana Souza', null);

const attention = (over: Partial<Parameters<typeof buildFamilyAttention>[0]> = {}) =>
  buildFamilyAttention({ members: [], measurements: [], doses: [], dismissals: [], today: TODAY, ...over });

describe('buildFamilyAttention — textos (F7.3)', () => {
  const { items } = attention({
    members: [lia, carlos, dirce],
    measurements: [lab('carlos', { value: 7.4, takenOn: '2026-10-12' })],
    doses: UP_TO_DATE_DOSES('carlos'),
  });
  const byTitle = (title: string) => items.find((i) => i.title === title);

  it('título "{nome} · {vacina} ({dose})"; o detalhe tem o estado e a data, sem repetir o título', () => {
    expect(byTitle('Lia · Febre amarela (1ª dose)')).toMatchObject({
      kind: 'vaccine-late',
      memberId: 'lia',
      date: '2026-10-10',
      detail: 'Atrasada pelo calendário · a partir de 10 de out. de 2026',
      target: { screen: 'vaccines', memberId: 'lia' },
    });
  });

  it('resultado fora da faixa do laudo (R15): título só com o exame, detalhe com estado, valor e data', () => {
    expect(byTitle('Carlos · Hemoglobina glicada')).toMatchObject({
      kind: 'lab-out-of-range',
      date: '2026-10-12',
      detail: 'Acima da faixa do laudo · 7,4 % · 12 de out.',
      target: { screen: 'exam-series', memberId: 'carlos', seriesKey: 'hba1c' },
    });
  });

  it('influenza pelo ano civil (R12): "Dirce · Influenza de 2026", sem dose no título', () => {
    expect(byTitle('Dirce · Influenza de 2026')).toMatchObject({ kind: 'vaccine-due', date: '2026-01-01', detail: 'Pendente · a partir de 1 de jan. de 2026' });
  });

  it('o estado aparece uma vez só: no detalhe, nunca no título', () => {
    for (const i of items) {
      const state = i.detail.split(' · ')[0]!.toLowerCase();
      expect(i.title.toLowerCase()).not.toContain(state);
    }
  });

  it('"conforme histórico" (R10) vira "confirmar na carteira", no grupo das pendentes e nunca atrasada', () => {
    const confirm = items.filter((i) => i.detail.startsWith('Confirmar na carteira'));
    expect(confirm.map((i) => i.title)).toContain('Dirce · Hepatite B (3 doses)');
    expect(confirm.every((i) => i.kind === 'vaccine-due')).toBe(true);
  });

  it('nenhum item "sem registro" nem palavra vetada', () => {
    const text = items.map((i) => `${i.title} ${i.detail}`).join(' ').toLowerCase();
    expect(text).not.toMatch(/sem registro|normal|alterado|grave|crítico|risco|alerta|urgente|!/);
  });

  it('resultado abaixo da faixa de outro ano leva o ano na data', () => {
    const below = attention({ members: [carlos], measurements: [lab('carlos', { value: 3.5, takenOn: '2025-12-05' })] }).items.find(
      (i) => i.kind === 'lab-out-of-range',
    );
    expect(below?.title).toBe('Carlos · Hemoglobina glicada');
    expect(below?.detail).toBe('Abaixo da faixa do laudo · 3,5 % · 5 de dez. de 2025');
  });
});

describe('buildFamilyAttention — ordem (F7.2, S9)', () => {
  it('por tipo (atrasadas → fora da faixa → pendentes e confirmar → próximas) e, no tipo, a data mais antiga primeiro', () => {
    const next = member('bebe', 'Bento Lima', '2025-12-01'); // SCR D1 em 01/12/2026: próxima
    const { items } = attention({
      members: [dirce, lia, next, carlos],
      measurements: [lab('carlos', { value: 7.4 })],
      doses: UP_TO_DATE_DOSES('carlos'),
    });
    const kinds = new Set(items.map((i) => i.kind));
    expect(kinds).toEqual(new Set(KIND_ORDER));
    for (let i = 1; i < items.length; i += 1) {
      const [a, b] = [items[i - 1]!, items[i]!];
      const byKind = KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
      expect(byKind <= 0).toBe(true);
      if (byKind === 0) expect(a.date <= b.date).toBe(true);
    }
    expect(items.filter((i) => i.kind === 'vaccine-next')).toContainEqual(
      expect.objectContaining({
        title: 'Bento · Tríplice viral (SCR, 1ª dose)',
        detail: 'Próxima · a partir de 1 de dez. de 2026',
      }),
    );
  });

  it('itens de pessoas diferentes se intercalam pela data, e a ordem das pessoas na lista não muda nada', () => {
    const measurements = [
      lab('carlos', { value: 7.4, takenOn: '2026-10-12' }),
      lab('carlos', { code: 'glucose', label: 'Glicose', value: 130, unit: 'mg/dL', referenceLow: 70, referenceHigh: 99, takenOn: '2026-08-01' }),
      lab('ana', { code: 'ferritin', label: 'Ferritina', value: 5, unit: 'ng/mL', referenceLow: 15, referenceHigh: 150, takenOn: '2026-09-01' }),
    ];
    const order = (members = [carlos, ana]) =>
      attention({ members, measurements, doses: UP_TO_DATE_DOSES('carlos') }).items.map((i) => `${i.title} | ${i.detail}`);
    expect(order()).toEqual([
      'Carlos · Glicose | Acima da faixa do laudo · 130 mg/dL · 1 de ago.',
      'Ana · Ferritina | Abaixo da faixa do laudo · 5 ng/mL · 1 de set.',
      'Carlos · Hemoglobina glicada | Acima da faixa do laudo · 7,4 % · 12 de out.',
    ]);
    expect(order([ana, carlos])).toEqual(order());
  });

  it('devolve todos os itens (a tela mostra 5 e "Ver todos ({n})")', () => {
    const { items } = attention({ members: [lia], doses: [dose('lia', 'bcg', '2026-01-10')] });
    expect(items.length).toBeGreaterThan(5);
  });
});

describe('buildFamilyAttention — linha coletiva e visibilidade (F7.4, F7.6)', () => {
  it('"x de y pessoas em dia", com quem não tem data de nascimento à parte', () => {
    const { vaccines } = attention({ members: [carlos, lia, ana], doses: UP_TO_DATE_DOSES('carlos') });
    expect(vaccines).toEqual({ upToDate: 1, total: 3, withoutBirthDate: 1 });
  });

  it('sem nenhum dado de saúde, o cartão fica oculto, mesmo com pendências pelo calendário', () => {
    const result = attention({ members: [lia] });
    expect(result.hasHealthData).toBe(false);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it('com qualquer medição, dose ou dispensa, o cartão aparece; sem itens, a lista fica vazia', () => {
    const result = attention({ members: [carlos], doses: UP_TO_DATE_DOSES('carlos') });
    expect(result.hasHealthData).toBe(true);
    expect(result.items).toEqual([]);
    expect(attention({ members: [ana], measurements: [lab('ana')] }).hasHealthData).toBe(true);
  });

  it('resultado dentro da faixa ou com mais de 12 meses não entra', () => {
    const { items } = attention({
      members: [ana],
      measurements: [lab('ana', { value: 5 }), lab('ana', { code: 'glucose', label: 'Glicose', value: 130, referenceLow: 70, referenceHigh: 99, takenOn: '2025-11-10' })],
    });
    expect(items).toEqual([]);
  });
});
