export const RECORD_TYPES = ['consultation', 'exam', 'result', 'report', 'prescription', 'vaccine', 'other'] as const;
/** consultation=consulta, exam=exame (pedido/realização), result=resultado, report=laudo, prescription=receita, vaccine=vacina. */
export type RecordType = (typeof RECORD_TYPES)[number];

export interface Attachment {
  id: string;
  recordId: string;
  /** Caminho no Storage privado: `{familyId}/{recordId}/{attachmentId}.{ext}`. Nunca uma URL pública. */
  storagePath: string;
  fileName: string;
  mimeType: string; // application/pdf, image/jpeg, image/png, image/heic...
  sizeBytes: number;
  createdAt: string;
}

export interface HealthRecord {
  id: string;
  familyId: string;
  memberId: string;
  type: RecordType;
  title: string;
  date: string; // YYYY-MM-DD (data do atendimento/exame)
  location: string | null; // clínica, laboratório, hospital
  professional: string | null; // médico(a), CRM etc.
  notes: string | null;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

/** Arquivo local escolhido pelo usuário (câmera, galeria ou arquivos). */
export interface LocalFile {
  uri: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface NewHealthRecord {
  familyId: string;
  memberId: string;
  type: RecordType;
  title: string;
  date: string;
  location: string | null;
  professional: string | null;
  notes: string | null;
}

export interface RecordQuery {
  memberId?: string;
  types?: RecordType[];
  /** Busca textual em título, local, profissional e notas. */
  text?: string;
}

export interface HealthRecordRepository {
  /** Ordenado por `date` desc, depois `createdAt` desc. */
  list(familyId: string, query?: RecordQuery): Promise<HealthRecord[]>;
  getById(id: string): Promise<HealthRecord | null>;
  create(input: NewHealthRecord): Promise<HealthRecord>;
  remove(id: string): Promise<void>;
  /** Registra o metadado de um anexo já enviado ao storage. */
  addAttachment(recordId: string, attachment: Omit<Attachment, 'recordId' | 'createdAt'>): Promise<Attachment>;
}

/** Porta de armazenamento de arquivos privados. */
export interface AttachmentStorage {
  /** Envia o arquivo e devolve o caminho no storage + id gerado. */
  upload(params: { familyId: string; recordId: string; file: LocalFile }): Promise<Omit<Attachment, 'recordId' | 'createdAt'>>;
  /** URL temporária (assinada) para visualizar o anexo. */
  getViewUrl(storagePath: string, expiresInSeconds?: number): Promise<string>;
  remove(storagePaths: string[]): Promise<void>;
}
