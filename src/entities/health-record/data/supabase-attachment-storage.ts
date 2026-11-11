import type { SupabaseClient } from '@supabase/supabase-js';
import { File } from 'expo-file-system';
import { HEALTH_FILES_BUCKET, backendError, removeHealthFiles } from '@/shared/api';
import { newId } from '@/shared/lib';
import { attachmentExtension, validateAttachment } from '../domain/attachment-rules';
import type { AttachmentStorage } from '../domain/health-record';

/** URL assinada de curta duração por padrão (5 min): o arquivo nunca fica acessível por link permanente. */
export const DEFAULT_SIGNED_URL_SECONDS = 300;

/** Anexos no bucket privado `health-files`, no caminho `{familyId}/{recordId}/{attachmentId}.{ext}` (a RLS do Storage usa o 1º segmento). */
export function createSupabaseAttachmentStorage(client: SupabaseClient): AttachmentStorage {
  return {
    async upload({ familyId, recordId, file }) {
      validateAttachment(file);

      // expo-file-system (SDK 58): `File` estende `Blob`; lemos os bytes e enviamos como ArrayBuffer (sem base64).
      let body: ArrayBuffer;
      try {
        body = await new File(file.uri).arrayBuffer();
      } catch (e) {
        throw backendError('attachment/read-failed', `Não foi possível ler "${file.fileName}".`, e);
      }
      // Confere o tamanho real (o informado pelo seletor pode divergir).
      validateAttachment({ ...file, sizeBytes: body.byteLength });

      const id = newId();
      const storagePath = `${familyId}/${recordId}/${id}.${attachmentExtension(file.mimeType)}`;
      const { error } = await client.storage
        .from(HEALTH_FILES_BUCKET)
        .upload(storagePath, body, { contentType: file.mimeType, upsert: false });
      if (error) throw backendError('attachment/upload-failed', `Não foi possível enviar "${file.fileName}". Tente novamente.`, error);

      return { id, storagePath, fileName: file.fileName, mimeType: file.mimeType, sizeBytes: body.byteLength };
    },

    async getViewUrl(storagePath, expiresInSeconds = DEFAULT_SIGNED_URL_SECONDS) {
      const { data, error } = await client.storage.from(HEALTH_FILES_BUCKET).createSignedUrl(storagePath, expiresInSeconds);
      if (error || !data?.signedUrl) throw backendError('attachment/url-failed', 'Não foi possível abrir o arquivo agora.', error);
      return data.signedUrl;
    },

    remove: (storagePaths) => removeHealthFiles(client, storagePaths),
  };
}
