export {
  RECORD_FIELD_MAX,
  RECORD_NOTES_MAX,
  RECORD_TITLE_MAX,
  addRecord,
  validateNewRecord,
} from './domain/add-record';
export type { AddRecordInput } from './domain/add-record';
export { useAddRecord } from './model/hooks';
