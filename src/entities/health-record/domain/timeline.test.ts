import type { HealthRecord, RecordType } from './health-record';
import { filterByTypes, groupByMonth, monthLabel, sortRecords } from './timeline';

const rec = (id: string, date: string, type: RecordType = 'exam', createdAt = '2026-01-01T00:00:00Z'): HealthRecord => ({
  id,
  familyId: 'f',
  memberId: 'm',
  type,
  title: id,
  date,
  location: null,
  professional: null,
  notes: null,
  attachments: [],
  createdAt,
  updatedAt: createdAt,
});

describe('linha do tempo', () => {
  const records = [
    rec('a', '2026-09-10', 'exam'),
    rec('b', '2026-11-02', 'consultation'),
    rec('c', '2026-11-20', 'vaccine'),
    rec('d', '2026-11-20', 'exam', '2026-12-01T00:00:00Z'),
    rec('e', '2025-12-31', 'report'),
  ];

  it('ordena por data desc e desempata por criação desc', () => {
    expect(sortRecords(records).map((r) => r.id)).toEqual(['d', 'c', 'b', 'a', 'e']);
  });

  it('filtra por tipos; lista vazia ou ausente não filtra', () => {
    expect(filterByTypes(records, ['exam', 'vaccine']).map((r) => r.id)).toEqual(['a', 'c', 'd']);
    expect(filterByTypes(records, [])).toHaveLength(5);
    expect(filterByTypes(records)).toHaveLength(5);
  });

  it('agrupa por mês YYYY-MM, do mais recente ao mais antigo', () => {
    const groups = groupByMonth(records);
    expect(groups.map((g) => g.month)).toEqual(['2026-11', '2026-09', '2025-12']);
    expect(groups[0]?.records.map((r) => r.id)).toEqual(['d', 'c', 'b']);
  });

  it('não muta a entrada e aceita lista vazia', () => {
    const copy = [...records];
    groupByMonth(records);
    expect(records).toEqual(copy);
    expect(groupByMonth([])).toEqual([]);
  });

  it('rotula o mês em português', () => {
    expect(monthLabel('2026-11')).toBe('novembro de 2026');
    expect(monthLabel('2026-03')).toBe('março de 2026');
    expect(monthLabel('lixo')).toBe('lixo');
  });
});
