import { DomainError, collapseSpaces, isValidIsoDate, toLocalIsoDate } from '@/shared/lib';
import {
  RECORD_TYPES,
  validateAttachment,
  type Attachment,
  type AttachmentStorage,
  type HealthRecord,
  type HealthRecordRepository,
  type LocalFile,
  type NewHealthRecord,
} from '@/entities/health-record';
import type { MeasurementRepository, NewMeasurement } from '@/entities/measurement';
import type { MedicationRepository, NewMedication } from '@/entities/medication';
import type { NewVaccineDose, VaccineDoseRepository } from '@/entities/vaccine';

export const RECORD_TITLE_MAX = 120;
export const RECORD_FIELD_MAX = 120;
export const RECORD_NOTES_MAX = 2000;
const MIN_RECORD_DATE = '1900-01-01';

type FromRecord = 'familyId' | 'memberId' | 'sourceRecordId' | 'origin';

/** Itens confirmados na revisão do OCR. Pessoa, família, documento de origem e `origin: 'ocr'` vêm do registro. */
export interface HealthDataInput {
  measurements: Omit<NewMeasurement, FromRecord>[];
  vaccineDoses: Omit<NewVaccineDose, FromRecord>[];
  medications: Omit<NewMedication, FromRecord>[];
}

/** Registro novo + arquivos locais a anexar. Campos opcionais vazios viram `null`. */
export interface AddRecordInput extends Omit<NewHealthRecord, 'location' | 'professional' | 'notes'> {
  location?: string | null;
  professional?: string | null;
  notes?: string | null;
  files: LocalFile[];
  /** Sem `healthData`, o comportamento é o do MVP. */
  healthData?: HealthDataInput;
}

type Deps = {
  records: HealthRecordRepository;
  storage: AttachmentStorage;
  measurements: MeasurementRepository;
  vaccineDoses: VaccineDoseRepository;
  medications: MedicationRepository;
};

function optional(value: string | null | undefined, max: number, label: string): string | null {
  const text = (value ?? '').trim();
  if (text === '') return null;
  if (text.length > max) throw new DomainError('record/field-too-long', `${label} deve ter no máximo ${max} caracteres.`);
  return text;
}

/** Valida e normaliza os campos do registro (sem tocar em rede/disco). */
export function validateNewRecord(input: AddRecordInput, now: Date = new Date()): NewHealthRecord {
  if (!input.familyId) throw new DomainError('record/missing-family', 'Crie sua família antes de adicionar registros.');
  if (!input.memberId) throw new DomainError('record/missing-member', 'Escolha de quem é este registro.');
  if (!RECORD_TYPES.some((t) => t === input.type)) throw new DomainError('record/invalid-type', 'Escolha o tipo do registro.');
  const title = collapseSpaces(input.title);
  if (title === '') throw new DomainError('record/missing-title', 'Informe um título para o registro.');
  if (title.length > RECORD_TITLE_MAX) {
    throw new DomainError('record/title-too-long', `O título deve ter no máximo ${RECORD_TITLE_MAX} caracteres.`);
  }
  const date = input.date.trim();
  if (!isValidIsoDate(date) || date < MIN_RECORD_DATE) throw new DomainError('record/invalid-date', 'Informe uma data válida.');
  if (date > toLocalIsoDate(now)) throw new DomainError('record/future-date', 'A data não pode estar no futuro.');
  return {
    familyId: input.familyId,
    memberId: input.memberId,
    type: input.type,
    title,
    date,
    location: optional(input.location, RECORD_FIELD_MAX, 'O local'),
    professional: optional(input.professional, RECORD_FIELD_MAX, 'O profissional'),
    notes: optional(input.notes, RECORD_NOTES_MAX, 'As observações'),
  };
}

/** Grava os itens ligados ao registro, uma porta por vez (cada `createMany` é tudo ou nada). */
async function saveHealthData(deps: Deps, record: HealthRecord, data: HealthDataInput): Promise<void> {
  const link = { familyId: record.familyId, memberId: record.memberId, sourceRecordId: record.id, origin: 'ocr' as const };
  if (data.measurements.length > 0) await deps.measurements.createMany(data.measurements.map((m) => ({ ...m, ...link })));
  if (data.vaccineDoses.length > 0) await deps.vaccineDoses.createMany(data.vaccineDoses.map((d) => ({ ...d, ...link })));
  if (data.medications.length > 0) await deps.medications.createMany(data.medications.map((m) => ({ ...m, ...link })));
}

/**
 * Cria o registro, envia os anexos, registra seus metadados e grava os itens de saúde confirmados.
 * Tudo ou nada: se algo falhar, apaga os arquivos e o próprio registro (a cascata leva os itens já gravados)
 * e lança `record/upload-failed` ou `record/health-data-failed`.
 */
export async function addRecord(deps: Deps, input: AddRecordInput, now: Date = new Date()): Promise<HealthRecord> {
  const { records, storage } = deps;
  const newRecord = validateNewRecord(input, now);
  input.files.forEach(validateAttachment);

  const record = await records.create(newRecord);
  const uploadedPaths: string[] = [];
  const attachments: Attachment[] = [];
  // Desfazer é "melhor esforço": a falha original é a que importa para o usuário.
  const undo = async () => {
    if (uploadedPaths.length > 0) await storage.remove(uploadedPaths).catch(() => undefined);
    await records.remove(record.id).catch(() => undefined);
  };

  let currentFile = '';
  try {
    for (const file of input.files) {
      currentFile = file.fileName;
      const stored = await storage.upload({ familyId: record.familyId, recordId: record.id, file });
      uploadedPaths.push(stored.storagePath);
      attachments.push(await records.addAttachment(record.id, stored));
    }
  } catch (cause) {
    await undo();
    throw new DomainError(
      'record/upload-failed',
      `Não foi possível enviar o anexo "${currentFile}". O registro não foi salvo; verifique a conexão e tente novamente.`,
      { cause },
    );
  }

  if (input.healthData) {
    try {
      await saveHealthData(deps, record, input.healthData);
    } catch (cause) {
      await undo();
      throw new DomainError(
        'record/health-data-failed',
        'Não foi possível salvar os dados lidos. O registro não foi salvo; tente novamente.',
        { cause },
      );
    }
  }
  return { ...record, attachments };
}
