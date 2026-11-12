// Saída do parser (ocr-tecnico.md §c.1 com o "Alinhamento com a spec"). Contrato congelado na F0; parser: F4.
import type { RecordType } from '@/entities/health-record';
import type { MedicationDuration } from '@/entities/medication';
import type { ReferenceFlag } from '@/entities/measurement';
import type { DoseKey } from '@/entities/vaccine';

/** Mesmos literais de Confidence (@/shared/ui). O domínio não importa ui/. */
export type Confidence = 'high' | 'medium' | 'low';

/** `evidence` = linha de origem (≤ 120), só em memória. */
export interface Suggestion<T> {
  value: T;
  confidence: Confidence;
  evidence: string;
}

export interface LabResultSuggestion {
  code: string;
  label: string;
  rawName: string;
  /** null = "Confira", sem valor preenchido (F1.8). */
  value: number | null;
  unit: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  referenceText: string | null;
  /** Derivado por computeFlag; não é gravado. */
  flag: ReferenceFlag;
  confidence: Confidence;
  evidence: string;
}

export interface VaccineSuggestion {
  vaccineCode: string;
  name: string;
  rawName: string;
  doseKey: DoseKey | null;
  doseLabel: string | null;
  lot: string | null;
  appliedOn: string | null;
  location: string | null;
  confidence: Confidence;
  evidence: string;
}

export interface MedicationSuggestion {
  name: string;
  dosage: string | null;
  instructions: string | null;
  duration: MedicationDuration;
  startOn: string | null;
  confidence: Confidence;
  evidence: string;
}

export type ParseWarningCode =
  | 'value-unreadable'
  | 'value-implausible'
  | 'value-censored'
  | 'unit-missing'
  | 'unit-not-convertible'
  | 'date-in-future'
  /** F1.6: a data sugerida era anterior ao nascimento da pessoa; descartada por readDocument ("Confira a data"). */
  | 'date-before-birth';

export interface ParseWarning {
  code: ParseWarningCode;
  label: string | null;
  evidence: string;
}

export interface HealthDocumentSuggestions {
  /** Linha "Paciente:"/"Nome:"; só para a A11, nunca salvo (P4). */
  patientName: Suggestion<string> | null;
  recordType: Suggestion<RecordType> | null;
  /** ≤ 120 (RECORD_TITLE_MAX). */
  title: Suggestion<string> | null;
  /** YYYY-MM-DD, nunca no futuro. */
  date: Suggestion<string> | null;
  location: Suggestion<string> | null;
  professional: Suggestion<string> | null;
  /** Um por código; só analitos do catálogo. */
  labResults: LabResultSuggestion[];
  vaccines: VaccineSuggestion[];
  medications: MedicationSuggestion[];
  warnings: ParseWarning[];
}

/** `sex` vem do Member (`unspecified`/`other` → não passa). */
export interface ParseOptions {
  today: string;
  sex?: 'female' | 'male';
}
