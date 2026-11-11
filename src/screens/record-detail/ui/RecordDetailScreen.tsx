import { useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMember } from '@/entities/member';
import {
  RECORD_TYPE_APPEARANCE,
  recordTypeLabel,
  useRecord,
  type Attachment,
  type HealthRecord,
} from '@/entities/health-record';
import { useDeleteRecord } from '@/features/delete-record';
import { AttachmentViewer } from '@/widgets/attachment-viewer';
import {
  Badge,
  Banner,
  Card,
  ConfirmSheet,
  EmptyState,
  Icon,
  ListItem,
  ListSection,
  LoadErrorState,
  Screen,
  Spinner,
  Text,
  errorMessage,
  formatDate,
  useTheme,
} from '@/shared/ui';

const sizeLabel = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** Detalhe de um registro: campos, anexos (abre em tela cheia) e exclusão com confirmação. */
export function RecordDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recordId = typeof id === 'string' ? id : undefined;
  const record = useRecord(recordId);
  const member = useMember(record.data?.memberId);
  const remove = useDeleteRecord();
  const [confirming, setConfirming] = useState(false);
  const [opened, setOpened] = useState<Attachment | null>(null);

  // Depois de apagar, não mostre "não encontrado" enquanto a tela fecha.
  if (remove.isPending || remove.isSuccess) return <Screen scroll={false}><Spinner fill label="Excluindo" /></Screen>;
  if (record.isPending) return <Screen scroll={false}><Spinner fill label="Carregando" /></Screen>;
  if (record.isError) return <Screen scroll={false}><LoadErrorState onRetry={() => void record.refetch()} /></Screen>;
  if (!record.data) {
    return (
      <Screen scroll={false}>
        <EmptyState icon="file" title="Registro não encontrado" message="Ele pode ter sido excluído." action={{ label: 'Voltar', onPress: () => router.back() }} />
      </Screen>
    );
  }
  const r: HealthRecord = record.data;
  const { colorIndex, icon } = RECORD_TYPE_APPEARANCE[r.type];

  return (
    <Screen testID="record-detail-screen">
      <Stack.Screen options={{ title: 'Registro' }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="ellipsis" title="Mais ações" accessibilityLabel="Mais ações">
          <Stack.Toolbar.MenuAction icon="trash" destructive onPress={() => setConfirming(true)}>
            Excluir registro
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      {remove.error ? <Banner tone="danger" message={errorMessage(remove.error, 'Não foi possível excluir. Nada foi apagado.')} style={{ marginBottom: theme.space[4] }} /> : null}
      <Card accent={colorIndex}>
        <Badge label={recordTypeLabel(r.type)} colorIndex={colorIndex} icon={icon} />
        <Text variant="title2" style={{ marginTop: theme.space[3] }} accessibilityRole="header">
          {r.title}
        </Text>
        <Text color="secondary" style={{ marginTop: theme.space[1] }}>
          {[member.data?.fullName, formatDate(r.date, 'long')].filter(Boolean).join(' · ')}
        </Text>
      </Card>

      <ListSection header="Informações" style={{ marginTop: theme.space[6] }} separatorInset="none">
        <ListItem leading={<Icon name="medical" size={22} color="textSecondary" />} title="Local" subtitle={r.location || 'Não informado'} testID="detail-location" />
        <ListItem leading={<Icon name="stethoscope" size={22} color="textSecondary" />} title="Profissional" subtitle={r.professional || 'Não informado'} testID="detail-professional" />
        <ListItem leading={<Icon name="fileText" size={22} color="textSecondary" />} title="Observações" subtitle={r.notes || 'Nenhuma observação'} testID="detail-notes" />
      </ListSection>

      <ListSection header="Anexos" style={{ marginTop: theme.space[6] }}>
        {r.attachments.length === 0 ? (
          <ListItem leading={<Icon name="attach" size={22} color="textSecondary" />} title="Nenhum arquivo anexado" subtitle="Os anexos deste registro aparecem aqui." />
        ) : (
          r.attachments.map((a) => (
            <ListItem
              key={a.id}
              leading={<Icon name={a.mimeType === 'application/pdf' ? 'fileText' : 'gallery'} size={24} color="textSecondary" />}
              title={a.fileName}
              subtitle={`${a.mimeType === 'application/pdf' ? 'PDF' : 'Imagem'} · ${sizeLabel(a.sizeBytes)}`}
              onPress={() => setOpened(a)}
              chevron
              accessibilityHint="Abre o arquivo em tela cheia"
              testID={`attachment-${a.id}`}
            />
          ))
        )}
      </ListSection>

      <AttachmentViewer attachment={opened} onClose={() => setOpened(null)} />
      <ConfirmSheet
        visible={confirming}
        destructive
        title="Excluir este registro?"
        message="O registro e os arquivos anexados serão apagados. Não dá para desfazer."
        confirmLabel="Excluir registro"
        loading={remove.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          remove.mutate(r.id, {
            onSuccess: () => router.back(),
            onSettled: () => setConfirming(false),
          })
        }
      />
    </Screen>
  );
}
