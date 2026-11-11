import { copyIntoLocalFiles, localFileUri, newId, removeLocalFiles } from '@/shared/lib';
import type { AttachmentStorage } from '../domain/health-record';
import { attachmentExtension } from '../domain/attachment-rules';

const extensionOf = (fileName: string, mimeType: string): string => {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(fileName);
  return m?.[1] ? m[1].toLowerCase() : attachmentExtension(mimeType);
};

/** Anexos no modo demonstração: copia para `Paths.document/health-files/{familyId}/{recordId}/{id}.{ext}`. */
export function createLocalAttachmentStorage(): AttachmentStorage {
  return {
    async upload({ familyId, recordId, file }) {
      const id = newId();
      const storagePath = `${familyId}/${recordId}/${id}.${extensionOf(file.fileName, file.mimeType)}`;
      await copyIntoLocalFiles(file.uri, storagePath);
      return { id, storagePath, fileName: file.fileName, mimeType: file.mimeType, sizeBytes: file.sizeBytes };
    },
    /** No modo demonstração o "link" é o uri local do arquivo (não expira). */
    getViewUrl: async (storagePath) => localFileUri(storagePath),
    async remove(storagePaths) {
      removeLocalFiles(storagePaths);
    },
  };
}
