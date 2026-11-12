import type { Measurement, MeasurementChanges, NewMeasurement } from './types';

export interface MeasurementRepository {
  listByMember(memberId: string): Promise<Measurement[]>;
  listByFamily(familyId: string): Promise<Measurement[]>;
  listBySourceRecord(recordId: string): Promise<Measurement[]>;
  createMany(items: NewMeasurement[]): Promise<Measurement[]>;
  update(id: string, changes: MeasurementChanges): Promise<Measurement>;
  remove(id: string): Promise<void>;
}
