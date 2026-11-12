export type {
  Measurement,
  MeasurementChanges,
  MeasurementContext,
  MeasurementKind,
  MeasurementOrigin,
  MeasurementSeries,
  NewMeasurement,
  ReferenceFlag,
  VitalCode,
} from './domain/types';
export type { MeasurementRepository } from './domain/ports';
export { ANALYTES, GROUP_TITLES, UNIT_ALIASES, VITALS, findAnalyte } from './domain/analyte-catalog';
export type { Analyte, AnalyteGroup } from './domain/analyte-catalog';
export { computeFlag } from './domain/reference';
export { spokenUnit } from './domain/spoken-unit';
export { formatMeasurementValue } from './domain/format-value';
export { buildSeries, latestOutOfRange, seriesKey, vitalSeries } from './domain/series';
export { measurementKeys, useFamilyMeasurements, useMemberMeasurements } from './model/queries';
export { useMeasurementRepository } from './model/dependencies';
export { createLocalMeasurementRepository } from './data/local-measurement-repository';
export { createSupabaseMeasurementRepository } from './data/supabase-measurement-repository';
export * from './ui';
