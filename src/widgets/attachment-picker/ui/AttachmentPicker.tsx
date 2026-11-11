import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActionSheet, Banner, Button, FieldLabel, Icon, IconButton, ListItem, Text, errorMessage, useTheme } from '@/shared/ui';
import { validateAttachment, type LocalFile } from '@/entities/health-record';
import { pickDocuments, pickFromLibrary, takePhoto } from '../lib/pick-attachments';

export interface AttachmentPickerProps {
  files: readonly LocalFile[];
  onChange: (files: LocalFile[]) => void;
  disabled?: boolean;
}

const formatSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Anexos do registro antes de salvar: botão "Adicionar anexo" (câmera, galeria ou arquivo) e a lista com
 * "Remover". Arquivos de tipo ou tamanho não aceitos são recusados na hora, com a razão.
 */
export function AttachmentPicker({ files, onChange, disabled = false }: AttachmentPickerProps) {
  const theme = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const add = async (pick: () => Promise<LocalFile[]>) => {
    setMessage(null);
    try {
      const picked = await pick();
      const accepted: LocalFile[] = [];
      const refused: string[] = [];
      for (const file of picked) {
        try {
          validateAttachment(file);
          accepted.push(file);
        } catch (error) {
          refused.push(errorMessage(error, `"${file.fileName}": arquivo não aceito.`));
        }
      }
      if (accepted.length > 0) onChange([...files, ...accepted]);
      if (refused.length > 0) setMessage(refused.join('\n'));
    } catch (error) {
      setMessage(errorMessage(error, 'Não foi possível adicionar o arquivo. Tente de novo.'));
    }
  };

  return (
    <View style={{ gap: theme.space[3] }}>
      <FieldLabel label="Anexos" optional />
      {message ? <Banner tone="danger" message={message} onDismiss={() => setMessage(null)} /> : null}
      {files.length > 0 ? (
        <View testID="attachment-list">
          {files.map((file, index) => (
            <ListItem
              key={`${file.uri}-${index}`}
              leading={<Icon name={file.mimeType === 'application/pdf' ? 'document-text-outline' : 'image-outline'} color="textSecondary" />}
              title={file.fileName}
              subtitle={formatSize(file.sizeBytes)}
              trailing={
                <IconButton
                  icon="close-circle-outline"
                  accessibilityLabel={`Remover anexo ${file.fileName}`}
                  onPress={() => onChange(files.filter((_, i) => i !== index))}
                  disabled={disabled}
                />
              }
            />
          ))}
        </View>
      ) : (
        <Text variant="subhead" color="secondary">
          Fotos de exames, receitas e laudos, ou PDFs. Até 20 MB cada.
        </Text>
      )}
      <View style={styles.row}>
        <Button label="Adicionar anexo" icon="attach-outline" variant="secondary" onPress={() => setSheetOpen(true)} disabled={disabled} />
      </View>
      <ActionSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Adicionar anexo"
        options={[
          { label: 'Tirar foto', icon: 'camera-outline', onPress: () => void add(takePhoto) },
          { label: 'Escolher da galeria', icon: 'images-outline', onPress: () => void add(pickFromLibrary) },
          { label: 'Escolher arquivo (PDF ou imagem)', icon: 'document-outline', onPress: () => void add(pickDocuments) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
});
