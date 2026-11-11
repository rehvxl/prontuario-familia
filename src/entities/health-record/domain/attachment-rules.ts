import { DomainError } from '@/shared/lib';
import type { LocalFile } from './health-record';

export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
] as const;

const EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
};

const normalizeMime = (mime: string) => mime.trim().toLowerCase();

export function isAllowedAttachmentType(mimeType: string): boolean {
  return (ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(normalizeMime(mimeType));
}

/** Extensão de arquivo para um tipo aceito (sem ponto); `bin` se desconhecido. */
export function attachmentExtension(mimeType: string): string {
  return EXTENSION_BY_MIME[normalizeMime(mimeType)] ?? 'bin';
}

/** Valida tipo e tamanho (máx. 20 MB). Lança `DomainError` com mensagem pt-BR. */
export function validateAttachment(file: LocalFile): void {
  if (!isAllowedAttachmentType(file.mimeType)) {
    throw new DomainError('attachment/invalid-type', `"${file.fileName}": tipo não aceito. Envie PDF, JPEG, PNG, HEIC ou WEBP.`);
  }
  if (!Number.isFinite(file.sizeBytes) || file.sizeBytes <= 0) {
    throw new DomainError('attachment/empty', `"${file.fileName}": o arquivo está vazio.`);
  }
  if (file.sizeBytes > MAX_ATTACHMENT_BYTES) {
    throw new DomainError('attachment/too-large', `"${file.fileName}": o arquivo passa de 20 MB.`);
  }
}
