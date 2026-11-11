import { File } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { DomainError } from '@/shared/lib';
import type { LocalFile } from '@/entities/health-record';

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  heif: 'image/heif',
  webp: 'image/webp',
};

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

function fileSize(uri: string, reported: number | undefined): number {
  if (reported !== undefined && reported > 0) return reported;
  try {
    return new File(uri).size;
  } catch {
    return 0;
  }
}

function fromImageAsset(asset: ImagePicker.ImagePickerAsset, index: number): LocalFile {
  const uriName = asset.uri.split('/').pop() ?? '';
  const fileName = asset.fileName ?? (uriName.includes('.') ? uriName : `foto-${Date.now()}-${index + 1}.jpg`);
  return {
    uri: asset.uri,
    fileName,
    mimeType: asset.mimeType ?? MIME_BY_EXTENSION[extensionOf(fileName)] ?? 'image/jpeg',
    sizeBytes: fileSize(asset.uri, asset.fileSize),
  };
}

function fromDocumentAsset(asset: DocumentPicker.DocumentPickerAsset): LocalFile {
  return {
    uri: asset.uri,
    fileName: asset.name,
    mimeType: asset.mimeType ?? MIME_BY_EXTENSION[extensionOf(asset.name)] ?? 'application/octet-stream',
    sizeBytes: fileSize(asset.uri, asset.size),
  };
}

/** Tira uma foto. Lança `DomainError` (pt-BR) se a permissão for negada ou a câmera não estiver disponível. */
export async function takePhoto(): Promise<LocalFile[]> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new DomainError('attachment/camera-denied', 'Permita o acesso à câmera nos Ajustes do aparelho para tirar fotos.');
  }
  let result: ImagePicker.ImagePickerResult;
  try {
    result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
  } catch (cause) {
    throw new DomainError('attachment/camera-unavailable', 'Não foi possível abrir a câmera neste aparelho. Tente escolher da galeria.', { cause });
  }
  return result.canceled ? [] : result.assets.map(fromImageAsset);
}

/** Escolhe uma ou mais fotos da galeria (o seletor do sistema não pede permissão de leitura da biblioteca). */
export async function pickFromLibrary(): Promise<LocalFile[]> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8 });
  return result.canceled ? [] : result.assets.map(fromImageAsset);
}

/** Escolhe PDFs ou imagens do app Arquivos (copiados para o cache do app). */
export async function pickDocuments(): Promise<LocalFile[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    multiple: true,
    copyToCacheDirectory: true,
  });
  return result.canceled ? [] : result.assets.map(fromDocumentAsset);
}
