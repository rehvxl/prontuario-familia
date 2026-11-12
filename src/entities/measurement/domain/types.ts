// Contrato congelado na F0 (docs/features/v0.2-plano-implementacao.md §3.1).

export type MeasurementKind = 'lab' | 'vital';
export type MeasurementOrigin = 'ocr' | 'manual';
export type MeasurementContext = 'fasting' | 'post_meal' | 'other';
/** Mesmos literais de ReferenceState (@/shared/ui). O domínio não importa ui/. */
export type ReferenceFlag = 'in' | 'high' | 'low' | 'none';
export type VitalCode = 'bp' | 'glucose_capillary' | 'weight' | 'height';

export interface Measurement {
  id: string;
  familyId: string;
  memberId: string;
  kind: MeasurementKind;
  /** ANALYTES[].code, VitalCode ou 'other'. */
  code: string;
  label: string;
  /** Sistólica em 'bp'. */
  value: number;
  /** Diastólica; não nulo se e só se code = 'bp'. */
  value2: number | null;
  unit: string;
  referenceLow: number | null;
  referenceHigh: number | null;
  referenceText: string | null;
  /** YYYY-MM-DD */
  takenOn: string;
  /** HH:mm */
  takenAt: string | null;
  /** Só em 'glucose_capillary'. */
  context: MeasurementContext | null;
  /** ≤ 140 caracteres. */
  note: string | null;
  sourceRecordId: string | null;
  origin: MeasurementOrigin;
  createdAt: string;
  updatedAt: string;
}

export type NewMeasurement = Omit<Measurement, 'id' | 'createdAt' | 'updatedAt'>;

export type MeasurementChanges = Partial<
  Pick<
    Measurement,
    | 'label'
    | 'value'
    | 'value2'
    | 'unit'
    | 'referenceLow'
    | 'referenceHigh'
    | 'referenceText'
    | 'takenOn'
    | 'takenAt'
    | 'context'
    | 'note'
  >
>;

export interface MeasurementSeries {
  /** R2: code, ou label normalizado em 'other'. */
  key: string;
  code: string;
  label: string;
  /** Unidade do resultado mais recente. */
  unit: string;
  /** Todos, por takenOn e takenAt crescentes. */
  points: Measurement[];
  latest: Measurement;
  /** R3: mesma unidade do mais recente; o gráfico só aparece com ≥ 2. */
  chart: Measurement[];
  /** "Unidade diferente, fora do gráfico". */
  offChart: Measurement[];
  /** R4 */
  band: { low: number; high: number } | null;
}
