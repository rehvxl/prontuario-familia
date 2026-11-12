// Contrato congelado na F0 (docs/features/v0.2-plano-implementacao.md §3.2).

export type DoseKey = 'D1' | 'D2' | 'D3' | 'R1' | 'R2' | 'R' | 'DU' | 'ANUAL' | 'PERIODICA' | 'OUTRA';

export interface VaccineDose {
  id: string;
  familyId: string;
  memberId: string;
  /** Código de calendario-vacinal-pni.md §2, ou 'other'. */
  vaccineCode: string;
  /** Obrigatório em 'other'. */
  vaccineName: string | null;
  doseKey: DoseKey;
  doseLabel: string;
  /** null = "Não sei a data". */
  appliedOn: string | null;
  lot: string | null;
  location: string | null;
  sourceRecordId: string | null;
  origin: 'ocr' | 'manual';
  createdAt: string;
  updatedAt: string;
}

export type NewVaccineDose = Omit<VaccineDose, 'id' | 'createdAt' | 'updatedAt'>;
export type VaccineDoseChanges = Partial<
  Pick<VaccineDose, 'vaccineCode' | 'vaccineName' | 'doseKey' | 'doseLabel' | 'appliedOn' | 'lot' | 'location'>
>;

export type DismissalReason = 'had_disease' | 'professional_advice' | 'other';
export interface VaccineRuleDismissal {
  id: string;
  familyId: string;
  memberId: string;
  ruleId: string;
  reason: DismissalReason;
  note: string | null;
  createdAt: string;
}
export type NewVaccineRuleDismissal = Omit<VaccineRuleDismissal, 'id' | 'createdAt'>;

/** Idade por calendário (birthDate + meses + dias). 1 m 15 d = { months: 1, days: 15 }; 5a = { months: 60 }. */
export interface ScheduleAge {
  months: number;
  days?: number;
}

/** Regra do calendário (calendario-vacinal-pni.md §9). */
export interface VaccineScheduleRule {
  /** 'penta_d1' */
  id: string;
  catalogVersion: 'PNI-2026-ed4';
  /** 'dtp_series' */
  series: string;
  /** Posição na série (1 = D1). Conta doses registradas de `countsAs`. */
  ordinal: number;
  /** O 'OUTRA' só existe na dose registrada. */
  doseKey: DoseKey;
  /** Vacina indicada nesta dose. */
  vaccineCode: string;
  /** Códigos que contam para a série. */
  countsAs: string[];
  /** Agenda oportuna; null = "conforme histórico". */
  recommended: ScheduleAge | null;
  windowStart: ScheduleAge;
  /** Exclusivo (véspera do aniversário); null = sem limite. */
  windowEnd: ScheduleAge | null;
  /** dT 120; covid idoso 6; influenza = ano civil (tratado à parte). */
  repeatEveryMonths?: number;
  /** Intervalo recomendado da IN (ex.: 60). */
  minIntervalFromPreviousDays?: number;
  automatic: boolean;
  /** Texto calmo exibido na carteira. */
  note?: string;
  /** Rótulo da dose quando difere de `doseLabelOf(doseKey)` (ex.: "Dose ao nascer"). */
  doseLabel?: string;
  /** Uma dose com data a partir desta idade também completa a regra (ex.: pneumocócica a partir de 12 m). */
  completedByDoseFromAge?: ScheduleAge;
  /** Se a regra indicada terminou a janela sem registro, esta também fica sem registro (rotavírus D2 depende da D1). */
  requiresRule?: string;
}

export type VaccineStatus = 'late' | 'due' | 'confirm' | 'next' | 'planned' | 'noRecord' | 'applied' | 'notApplicable';

export interface RuleEvaluation {
  rule: VaccineScheduleRule;
  status: VaccineStatus;
  dueFrom: string | null;
  dismissal: VaccineRuleDismissal | null;
}

export interface VaccineEvaluation {
  /** R13 */
  missingBirthDate: boolean;
  /** late → due → confirm → next (F3.1). */
  pending: RuleEvaluation[];
  /** Mais recente primeiro; sem data por último. */
  applied: VaccineDose[];
  /** Regras automáticas da faixa. */
  calendar: RuleEvaluation[];
  /** automatic = false (F3.8). */
  other: VaccineScheduleRule[];
  notApplicable: RuleEvaluation[];
}
