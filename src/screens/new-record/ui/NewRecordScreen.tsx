import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMyFamily } from '@/entities/family';
import { useMembers } from '@/entities/member';
import { RECORD_TYPE_LABELS, RECORD_TYPES, type LocalFile, type RecordType } from '@/entities/health-record';
import { RECORD_NOTES_MAX, validateNewRecord, useAddRecord, type AddRecordInput } from '@/features/add-record';
import { AttachmentPicker } from '@/widgets/attachment-picker';
import { isDomainError } from '@/shared/lib';
import {
  Banner,
  Button,
  DateField,
  EmptyState,
  LoadErrorState,
  Screen,
  Select,
  Spinner,
  TextField,
  errorMessage,
  toISODate,
  useTheme,
} from '@/shared/ui';

const typeOptions = RECORD_TYPES.map((value) => ({ value, label: RECORD_TYPE_LABELS[value] }));

type Field = 'member' | 'type' | 'title' | 'date';
const FIELD_OF_CODE: Record<string, Field> = {
  'record/missing-member': 'member',
  'record/invalid-type': 'type',
  'record/missing-title': 'title',
  'record/title-too-long': 'title',
  'record/invalid-date': 'date',
  'record/future-date': 'date',
};

/** Novo registro de saúde, com anexos opcionais (câmera, galeria ou arquivo). Valida em pt-BR antes de enviar. */
export function NewRecordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ memberId?: string }>();
  const presetMemberId = typeof params.memberId === 'string' && params.memberId !== '' ? params.memberId : null;
  const family = useMyFamily().data ?? null;
  const members = useMembers(family?.id);
  const addRecord = useAddRecord();
  const today = useMemo(() => toISODate(new Date()), []);

  const [memberId, setMemberId] = useState<string | null>(presetMemberId);
  const [type, setType] = useState<RecordType | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<string | null>(today);
  const [location, setLocation] = useState('');
  const [professional, setProfessional] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});

  if (members.isError) return <Screen scroll={false}><LoadErrorState onRetry={() => void members.refetch()} /></Screen>;
  if (!family || members.isPending) return <Screen scroll={false}><Spinner fill label="Carregando" /></Screen>;
  if (members.data.length === 0) {
    return (
      <Screen scroll={false}>
        <EmptyState
          icon="people"
          title="Adicione uma pessoa primeiro"
          message="O registro precisa pertencer a alguém da família."
          action={{ label: 'Adicionar pessoa', onPress: () => router.replace('/(main)/member/new') }}
        />
      </Screen>
    );
  }

  // Com uma só pessoa na família, o registro já abre com ela escolhida.
  const soleMemberId = members.data.length === 1 ? members.data[0]!.id : null;
  const selectedMemberId = memberId ?? soleMemberId;
  const memberOptions = members.data.map((m) => ({ value: m.id, label: m.fullName }));
  const serverField = isDomainError(addRecord.error) ? FIELD_OF_CODE[addRecord.error.code] : undefined;
  const saveError = addRecord.error && !serverField ? addRecord.error : null;

  const submit = () => {
    const input: AddRecordInput = {
      familyId: family.id,
      memberId: selectedMemberId ?? '',
      type: type ?? ('' as RecordType),
      title,
      date: date ?? '',
      location,
      professional,
      notes,
      files,
    };
    try {
      validateNewRecord(input);
    } catch (error) {
      if (isDomainError(error)) {
        const field = FIELD_OF_CODE[error.code];
        if (field) {
          setFieldErrors({ [field]: error.message });
          return;
        }
        setFieldErrors({});
      }
    }
    setFieldErrors({});
    addRecord.mutate(input, {
      onSuccess: (record) => {
        if (presetMemberId) router.back();
        else router.replace({ pathname: '/(main)/member/[id]', params: { id: record.memberId } });
      },
    });
  };

  const fieldError = (field: Field) => fieldErrors[field] ?? (serverField === field && addRecord.error ? errorMessage(addRecord.error) : null);
  const busy = addRecord.isPending;

  return (
    <Screen
      testID="new-record-screen"
      presentation="sheet"
      footer={<Button label="Salvar registro" onPress={submit} loading={busy} fullWidth testID="save-record" />}
    >
      <View style={{ gap: theme.layout.fieldGap }}>
        {saveError ? <Banner tone="danger" message={errorMessage(saveError, 'Não foi possível salvar o registro. Tente novamente.')} testID="save-error" /> : null}
        <Select label="Pessoa" options={memberOptions} value={selectedMemberId} onChange={setMemberId} placeholder="Escolher pessoa" error={fieldError('member')} disabled={busy} testID="member-select" />
        <Select label="Tipo" options={typeOptions} value={type} onChange={setType} placeholder="Escolher tipo" error={fieldError('type')} disabled={busy} testID="type-select" />
        <TextField label="Título" value={title} onChangeText={setTitle} placeholder="Ex.: Hemograma completo" error={fieldError('title')} disabled={busy} returnKeyType="next" testID="title-input" />
        <DateField label="Data" value={date} onChange={setDate} maximumDate={today} error={fieldError('date')} disabled={busy} testID="date-field" />
        <TextField label="Local" optional value={location} onChangeText={setLocation} placeholder="Clínica ou laboratório" disabled={busy} returnKeyType="next" testID="location-input" />
        <TextField label="Profissional" optional value={professional} onChangeText={setProfessional} placeholder="Nome do médico(a)" disabled={busy} returnKeyType="next" testID="professional-input" />
        <TextField label="Observações" optional value={notes} onChangeText={setNotes} multiline maxLength={RECORD_NOTES_MAX} disabled={busy} testID="notes-input" />
        <AttachmentPicker files={files} onChange={setFiles} disabled={busy} />
      </View>
    </Screen>
  );
}
