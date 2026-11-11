import { useState } from 'react';
import { View } from 'react-native';
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
  Button,
  Card,
  ConfirmSheet,
  Divider,
  EmptyState,
  Icon,
  ListItem,
  LoadErrorState,
  Screen,
  Spinner,
  Text,
  errorMessage,
  formatDate,
  useTheme,
} from '@/shared/ui';

const sizeLabel = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

function Field({ label, value }: { label: string; value: string | null }) {
  const theme = useTheme();
  if (!value) return null;
  return (
    <View style={{ marginTop: theme.space[4] }}>
      <Text variant="footnote" color="secondary">
        {label}
      </Text>
      <Text>{value}</Text>
    </View>
  );
}

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
        <EmptyState icon="document-outline" title="Registro não encontrado" message="Ele pode ter sido excluído." action={{ label: 'Voltar', onPress: () => router.back() }} />
      </Screen>
    );
  }
  const r: HealthRecord = record.data;
  const { colorIndex, icon } = RECORD_TYPE_APPEARANCE[r.type];

  return (
    <Screen
      testID="record-detail-screen"
      footer={<Button label="Excluir registro" variant="destructive" icon="trash-outline" onPress={() => setConfirming(true)} fullWidth testID="delete-record" />}
    >
      <Stack.Screen options={{ title: 'Registro' }} />
      {remove.error ? <Banner tone="danger" message={errorMessage(remove.error, 'Não foi possível excluir. Nada foi apagado.')} style={{ marginBottom: theme.space[4] }} /> : null}
      <Card tab={colorIndex}>
        <Badge label={recordTypeLabel(r.type)} colorIndex={colorIndex} icon={icon} />
        <Text variant="title2" style={{ marginTop: theme.space[3] }} accessibilityRole="header">
          {r.title}
        </Text>
        <Field label="Pessoa" value={member.data?.fullName ?? null} />
        <Field label="Data" value={formatDate(r.date, 'long')} />
        <Field label="Local" value={r.location} />
        <Field label="Profissional" value={r.professional} />
        <Field label="Observações" value={r.notes} />
      </Card>

      <Text variant="headline" style={{ marginTop: theme.space[6], marginBottom: theme.space[2] }} accessibilityRole="header">
        Anexos
      </Text>
      {r.attachments.length === 0 ? (
        <Text color="secondary">Nenhum arquivo anexado a este registro.</Text>
      ) : (
        <View>
          {r.attachments.map((a, i) => (
            <View key={a.id}>
              {i > 0 ? <Divider /> : null}
              <ListItem
                leading={<Icon name={a.mimeType === 'application/pdf' ? 'document-text-outline' : 'image-outline'} size={24} color="textSecondary" />}
                title={a.fileName}
                subtitle={`${a.mimeType === 'application/pdf' ? 'PDF' : 'Imagem'} · ${sizeLabel(a.sizeBytes)}`}
                onPress={() => setOpened(a)}
                chevron
                accessibilityHint="Abre o arquivo em tela cheia"
                testID={`attachment-${a.id}`}
              />
            </View>
          ))}
        </View>
      )}

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
