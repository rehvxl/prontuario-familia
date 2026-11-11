import type { RecordType } from './health-record';

export const RECORD_TYPE_LABELS: Readonly<Record<RecordType, string>> = {
  consultation: 'Consulta',
  exam: 'Exame',
  result: 'Resultado',
  report: 'Laudo',
  prescription: 'Receita',
  vaccine: 'Vacina',
  other: 'Outro',
};

export const recordTypeLabel = (type: RecordType): string => RECORD_TYPE_LABELS[type];
