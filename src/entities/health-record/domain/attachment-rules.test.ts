import { isDomainError } from '@/shared/lib';
import type { LocalFile } from './health-record';
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
  attachmentExtension,
  isAllowedAttachmentType,
  validateAttachment,
} from './attachment-rules';
import { RECORD_TYPES } from './health-record';
import { RECORD_TYPE_LABELS } from './labels';

const file = (over: Partial<LocalFile> = {}): LocalFile => ({
  uri: 'file:///x',
  fileName: 'exame.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1000,
  ...over,
});

const codeOf = (fn: () => void) => {
  try {
    fn();
  } catch (e) {
    return isDomainError(e) ? e.code : 'outro';
  }
  return null;
};

describe('validateAttachment', () => {
  it.each(ALLOWED_ATTACHMENT_MIME_TYPES)('aceita %s', (mimeType) => {
    expect(codeOf(() => validateAttachment(file({ mimeType })))).toBeNull();
  });

  it('aceita exatamente 20 MB e recusa 1 byte acima', () => {
    expect(codeOf(() => validateAttachment(file({ sizeBytes: MAX_ATTACHMENT_BYTES })))).toBeNull();
    expect(codeOf(() => validateAttachment(file({ sizeBytes: MAX_ATTACHMENT_BYTES + 1 })))).toBe('attachment/too-large');
  });

  it('recusa tipos fora da lista e arquivos vazios, com o nome do arquivo na mensagem', () => {
    expect(codeOf(() => validateAttachment(file({ mimeType: 'application/zip' })))).toBe('attachment/invalid-type');
    expect(codeOf(() => validateAttachment(file({ sizeBytes: 0 })))).toBe('attachment/empty');
    expect(() => validateAttachment(file({ fileName: 'virus.exe', mimeType: 'application/x-msdownload' }))).toThrow(/virus\.exe/);
  });

  it('ignora caixa e espaços no mime type', () => {
    expect(isAllowedAttachmentType(' Image/JPEG ')).toBe(true);
    expect(attachmentExtension('IMAGE/HEIC')).toBe('heic');
    expect(attachmentExtension('application/zip')).toBe('bin');
  });
});

describe('rótulos pt-BR', () => {
  it('cobre todos os tipos de registro', () => {
    expect(RECORD_TYPES.map((t) => RECORD_TYPE_LABELS[t])).toEqual([
      'Consulta',
      'Exame',
      'Resultado',
      'Laudo',
      'Receita',
      'Vacina',
      'Outro',
    ]);
  });
});
