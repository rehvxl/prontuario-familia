export type {
  DocumentTextAvailability,
  DocumentTextExtractor,
  ExtractedPage,
  ExtractedText,
  ExtractedTextSource,
} from './domain/document-text';
export type {
  Confidence,
  HealthDocumentSuggestions,
  LabResultSuggestion,
  MedicationSuggestion,
  ParseOptions,
  ParseWarning,
  ParseWarningCode,
  Suggestion,
  VaccineSuggestion,
} from './domain/suggestions';
export {
  READ_DOCUMENT_MAX_FILES,
  READ_DOCUMENT_MAX_PAGES,
  READ_DOCUMENT_TIMEOUT_MS,
  readDocument,
} from './domain/read-document';
export type { ReadDocumentOptions, ReadDocumentResult } from './domain/read-document';
export {
  createDeviceDocumentTextExtractor,
  unavailableDocumentTextExtractor,
} from './data/native-document-text-extractor';
export type { DocumentTextNativeModule } from './data/native-document-text-extractor';
export { createDemoDocumentTextExtractor } from './data/demo-document-text-extractor';
export { useReadDocument } from './model/hooks';
export type { ReadDocumentInput, UseReadDocument } from './model/hooks';
export { ScanProgress } from './ui/ScanProgress';
export type { ScanProgressProps } from './ui/ScanProgress';
