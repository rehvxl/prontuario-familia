import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMyFamily } from '@/entities/family';
import { useMembers, type Member } from '@/entities/member';
import { RECORD_TYPE_LABELS, RECORD_TYPES, type LocalFile, type RecordType } from '@/entities/health-record';
import { RECORD_NOTES_MAX, validateNewRecord, useAddRecord, type AddRecordInput } from '@/features/add-record';
import { ScanProgress, useReadDocument, type ReadDocumentResult } from '@/features/read-document';
import { AttachmentPicker } from '@/widgets/attachment-picker';
import { FoundItems, SuggestionNote, countSelected, createReviewItems, toHealthData, type ReviewItem } from '@/widgets/document-review';
import { isDomainError } from '@/shared/lib';
import {
  Badge,
  Banner,
  Button,
  ConfirmSheet,
  DateField,
  EmptyState,
  FieldMessage,
  HueProvider,
  LoadErrorState,
  Screen,
  SectionHeader,
  Select,
  Spinner,
  SuggestedField,
  Text,
  TextField,
  categoricalIndexFor,
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

/** Campos que a leitura pode sugerir. Sem entrada no mapa = valor padrão ou digitado antes da leitura. */
type Suggestable = 'type' | 'title' | 'date' | 'location' | 'professional';
type Origin = 'ocr' | 'user';

// Copy da spec (§3.3) e do plano (Q8, aprovada em 11/11/2026).
const A1 = 'A faixa de referência é a impressa no laudo. Só o profissional de saúde pode interpretar o resultado.';
const A6 = 'Confira cada item com o documento. Só o que você marcar será salvo.';
const A8 = 'Texto simulado (modo demonstração)';
const A9 = 'A leitura automática não está disponível nesta versão do app. Preencha os dados abaixo.';
const A10 = 'Não conseguimos ler o texto deste documento. Preencha os dados abaixo. O arquivo foi anexado.';
const a11 = (name: string) => `O nome no documento parece ser de outra pessoa (${name}). Confira antes de salvar.`;
const NOTHING_FOUND = 'Nenhum exame, vacina ou medicamento encontrado. Você pode adicionar depois.';
/** Copy nova (spec Q8): anexo sem pessoa não dispara a leitura, que precisa do nome e da idade de quem é o documento. */
const CHOOSE_MEMBER_TO_READ = 'Escolha a pessoa para ler o documento.';

const saveLabel = (n: number) => (n === 0 ? 'Salvar registro' : `Salvar registro e ${n} ${n === 1 ? 'item' : 'itens'}`);

/** Leitura sem nenhuma sugestão = sem texto aproveitável (A10). */
const isEmptyRead = ({ suggestions: s }: ReadDocumentResult) =>
  !s.recordType && !s.title && !s.date && !s.location && !s.professional && s.labResults.length + s.vaccines.length + s.medications.length === 0;

const readerMember = (m: Member) => ({
  sex: m.sex === 'female' || m.sex === 'male' ? m.sex : undefined,
  member: { firstName: m.fullName.trim().split(/\s+/)[0] ?? '', birthDate: m.birthDate },
});

/**
 * Novo registro de saúde: formulário → leitura do documento (sozinha, ao anexar) → revisão das sugestões,
 * tudo na mesma folha (spec F1 e §9; ocr-tecnico.md §f). O resultado da leitura vive só no estado desta tela
 * e some ao sair ou ao descartar (P3).
 */
export function NewRecordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ memberId?: string }>();
  const presetMemberId = typeof params.memberId === 'string' && params.memberId !== '' ? params.memberId : null;
  const family = useMyFamily().data ?? null;
  const members = useMembers(family?.id);
  const addRecord = useAddRecord();
  const today = useMemo(() => toISODate(new Date()), []);
  const [progress, setProgress] = useState({ current: 1, total: 1 });
  const reader = useReadDocument(setProgress);

  const [memberId, setMemberId] = useState<string | null>(presetMemberId);
  const [type, setType] = useState<RecordType | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<string | null>(today);
  const [dateTouched, setDateTouched] = useState(false);
  const [location, setLocation] = useState('');
  const [professional, setProfessional] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});

  const [phase, setPhase] = useState<'form' | 'reading' | 'review'>('form');
  // Só o primeiro anexo dispara a leitura (Q9); anexos seguintes não são lidos de novo.
  const [readAttempted, setReadAttempted] = useState(false);
  const [notice, setNotice] = useState<'unavailable' | 'failed' | null>(null);
  const [result, setResult] = useState<ReadDocumentResult | null>(null);
  const [origins, setOrigins] = useState<Partial<Record<Suggestable, Origin>>>({});
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [discarding, setDiscarding] = useState(false);

  // v4: a folha fica na divisória da pessoa escolhida (ultramar, a da família, enquanto nenhuma).
  const list = members.data ?? [];
  const hueMemberId = memberId ?? (list.length === 1 ? list[0]!.id : null);
  const boardHue = hueMemberId ? theme.personBoard(categoricalIndexFor(hueMemberId)) : 'ultramar';
  const leaf = { paddingLeft: theme.layout.leafMargin };

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
  const selectedMember = members.data.find((m) => m.id === selectedMemberId) ?? null;
  const memberOptions = members.data.map((m) => ({ value: m.id, label: m.fullName }));
  const serverField = isDomainError(addRecord.error) ? FIELD_OF_CODE[addRecord.error.code] : undefined;
  const saveError = addRecord.error && !serverField ? addRecord.error : null;
  const busy = addRecord.isPending;
  const review = phase === 'review' && result !== null;
  const selectedCount = review ? countSelected(items) : 0;
  const s = result?.suggestions;

  /** Aplica as sugestões só onde o campo está vazio (a data padrão de hoje conta como vazia). */
  const applySuggestions = (read: ReadDocumentResult) => {
    const sug = read.suggestions;
    const next: Partial<Record<Suggestable, Origin>> = {};
    if (sug.recordType && type === null) {
      setType(sug.recordType.value);
      next.type = 'ocr';
    }
    if (sug.title && title.trim() === '') {
      setTitle(sug.title.value);
      next.title = 'ocr';
    }
    if (!dateTouched) {
      if (sug.date) {
        setDate(sug.date.value);
        next.date = 'ocr';
      } else if (sug.warnings.some((w) => w.code === 'date-in-future' || w.code === 'date-before-birth')) {
        setDate(null); // F1.6: nada de data errada nem de "hoje" no lugar; a pessoa confere.
      }
    }
    if (sug.location && location.trim() === '') {
      setLocation(sug.location.value);
      next.location = 'ocr';
    }
    if (sug.professional && professional.trim() === '') {
      setProfessional(sug.professional.value);
      next.professional = 'ocr';
    }
    setOrigins(next);
    setItems(createReviewItems(sug));
    setResult(read);
  };

  const startReading = (toRead: LocalFile[], member: Member) => {
    setReadAttempted(true);
    if (reader.availability === 'unavailable') {
      setNotice('unavailable'); // F1.13
      return;
    }
    setProgress({ current: 1, total: Math.min(toRead.length, 5) });
    setPhase('reading');
    reader
      .mutateAsync({ files: toRead, ...readerMember(member) })
      .then((read) => {
        if (!read) {
          setNotice('unavailable');
          setPhase('form');
        } else if (isEmptyRead(read)) {
          setNotice('failed');
          setPhase('form');
        } else {
          applySuggestions(read);
          setPhase('review');
        }
      })
      .catch((error: unknown) => {
        // "Pular leitura" cancela: formulário manual sem aviso. Qualquer outro erro (inclusive 20 s): A10.
        if (!(isDomainError(error) && error.code === 'ocr/cancelled')) setNotice('failed');
        setPhase('form');
      });
  };

  const maybeRead = (nextFiles: LocalFile[], nextMemberId: string | null) => {
    const member = members.data.find((m) => m.id === nextMemberId);
    if (!readAttempted && nextFiles.length > 0 && member) startReading(nextFiles, member);
  };

  const changeFiles = (next: LocalFile[]) => {
    setFiles(next);
    if (next.length > files.length) maybeRead(next, selectedMemberId);
  };

  const changeMember = (id: string) => {
    setMemberId(id);
    maybeRead(files, id);
  };

  const userEdit = (field: Suggestable) => setOrigins((o) => (o[field] ? { ...o, [field]: 'user' } : o));

  const discardReading = () => {
    if (origins.type === 'ocr') setType(null);
    if (origins.title === 'ocr') setTitle('');
    if (origins.date === 'ocr' || !dateTouched) setDate(today);
    if (origins.location === 'ocr') setLocation('');
    if (origins.professional === 'ocr') setProfessional('');
    setOrigins({});
    setItems([]);
    setItemErrors({});
    setResult(null);
    reader.reset();
    setDiscarding(false);
    setPhase('form');
  };

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
    if (selectedCount > 0) {
      const { data, errors } = toHealthData(items, { familyId: family.id, memberId: input.memberId, recordDate: input.date, today });
      setItemErrors(errors);
      if (Object.keys(errors).length > 0) return;
      input.healthData = data;
    }
    addRecord.mutate(input, {
      onSuccess: (record) => {
        if (presetMemberId) router.back();
        else router.dismissTo({ pathname: '/(main)/(tabs)/(family)', params: { member: record.memberId } });
      },
    });
  };

  const fieldError = (field: Field) => fieldErrors[field] ?? (serverField === field && addRecord.error ? errorMessage(addRecord.error) : null);

  if (phase === 'reading') {
    const photo = files.find((f) => f.mimeType.startsWith('image/'));
    return (
      <HueProvider hue={boardHue}>
        <Screen presentation="sheet" scroll={false} testID="new-record-reading">
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <ScanProgress current={progress.current} total={progress.total} thumbnailUri={photo?.uri} onSkip={reader.cancel} />
          </View>
        </Screen>
      </HueProvider>
    );
  }

  const noticeBanner =
    notice === 'unavailable' ? (
      <Banner tone="info" message={A9} testID="read-unavailable" />
    ) : notice === 'failed' ? (
      <Banner tone="warning" message={A10} testID="read-failed" />
    ) : null;

  const attachments = <AttachmentPicker files={files} onChange={changeFiles} disabled={busy} />;
  const notesField = (
    <TextField label="Observações" optional value={notes} onChangeText={setNotes} multiline maxLength={RECORD_NOTES_MAX} disabled={busy} testID="notes-input" />
  );
  const footer = (
    <Button
      label={saveLabel(selectedCount)}
      onPress={submit}
      loading={busy}
      fullWidth
      testID="save-record"
      accessibilityHint={review ? (selectedCount === 0 ? 'Nenhum item marcado será salvo' : undefined) : undefined}
    />
  );
  const saveBanner = saveError ? (
    <Banner tone="danger" message={errorMessage(saveError, 'Não foi possível salvar o registro. Tente novamente.')} testID="save-error" />
  ) : null;

  if (!review || !s) {
    // A leitura espera a pessoa (nome e idade conferem o documento) e começa assim que ela é escolhida.
    const waitingForMember = !readAttempted && files.length > 0 && !selectedMemberId && reader.availability !== 'unavailable';
    return (
      <HueProvider hue={boardHue}>
        <Screen testID="new-record-screen" presentation="sheet" footer={footer} contentContainerStyle={leaf}>
          <View style={{ gap: theme.layout.fieldGap }}>
            {saveBanner}
            {noticeBanner}
            <Select
              label="Pessoa"
              options={memberOptions}
              value={selectedMemberId}
              onChange={changeMember}
              placeholder="Escolher pessoa"
              helper={waitingForMember ? CHOOSE_MEMBER_TO_READ : undefined}
              error={fieldError('member')}
              disabled={busy}
              testID="member-select"
            />
            {attachments}
            <Select label="Tipo" options={typeOptions} value={type} onChange={setType} placeholder="Escolher tipo" error={fieldError('type')} disabled={busy} testID="type-select" />
            <TextField label="Título" value={title} onChangeText={setTitle} placeholder="Ex.: Hemograma completo" error={fieldError('title')} disabled={busy} returnKeyType="next" testID="title-input" />
            <DateField
              label="Data"
              value={date}
              onChange={(d) => {
                setDate(d);
                setDateTouched(true);
              }}
              maximumDate={today}
              error={fieldError('date')}
              disabled={busy}
              testID="date-field"
            />
            <TextField label="Local" optional value={location} onChangeText={setLocation} placeholder="Clínica ou laboratório" disabled={busy} returnKeyType="next" testID="location-input" />
            <TextField label="Profissional" optional value={professional} onChangeText={setProfessional} placeholder="Nome do médico(a)" disabled={busy} returnKeyType="next" testID="professional-input" />
            {notesField}
          </View>
        </Screen>
      </HueProvider>
    );
  }

  // ---- Revisar dados do documento (spec F1, passos 1 a 3) ----
  const origin = (field: Suggestable) => origins[field] ?? 'default';
  const textField = (field: 'title' | 'location' | 'professional', label: string, value: string, set: (v: string) => void) => {
    const suggestion = s[field];
    return (
      <View>
        <SuggestedField
          label={label}
          value={value}
          onChange={(v) => {
            set(v);
            userEdit(field);
          }}
          origin={origin(field)}
          confidence={origin(field) === 'ocr' ? suggestion?.confidence : undefined}
          sourceHint={suggestion?.evidence}
          editable={!busy}
          required={field === 'title'}
          testID={`review-${field}`}
        />
        <FieldMessage error={field === 'title' ? fieldError('title') : null} />
      </View>
    );
  };
  const dateWarning = date === null && s.warnings.some((w) => w.code === 'date-in-future' || w.code === 'date-before-birth');
  const hasLabs = items.some((i) => i.group === 'lab');

  return (
    <HueProvider hue={boardHue}>
      <Screen testID="new-record-review" presentation="sheet" footer={footer} contentContainerStyle={leaf}>
        <Stack.Screen options={{ title: 'Revisar dados' }} />
        <View style={{ gap: theme.space[4] }}>
          {saveBanner}
          <Banner tone="info" message={A6} testID="review-intro" />
          {result.engine === 'demo' ? <Badge label={A8} tone="primary" icon="flask" testID="review-demo" /> : null}
          {result.truncated ? (
            <Text variant="footnote" color="secondary">
              Lemos as primeiras 5 páginas.
            </Text>
          ) : null}
          {result.patientNameMismatch && s.patientName ? <Banner tone="warning" message={a11(s.patientName.value)} testID="review-name-mismatch" /> : null}
          {attachments}
        </View>

        <SectionHeader title="Registro" />
        <View style={{ gap: theme.layout.fieldGap }}>
          <SuggestedField label="Pessoa" value={selectedMember?.fullName ?? ''} onChange={() => undefined} origin="user" editable={false} testID="review-member" />
          <View>
            <Select
              label="Tipo"
              options={typeOptions}
              value={type}
              onChange={(t) => {
                setType(t);
                userEdit('type');
              }}
              placeholder="Escolher tipo"
              error={fieldError('type')}
              disabled={busy}
              testID="type-select"
            />
            {origin('type') === 'ocr' && s.recordType ? <SuggestionNote confidence={s.recordType.confidence} evidence={s.recordType.evidence} testID="type-suggestion" /> : null}
          </View>
          {textField('title', 'Título', title, setTitle)}
          <View>
            <DateField
              label="Data"
              value={date}
              onChange={(d) => {
                setDate(d);
                setDateTouched(true);
                userEdit('date');
              }}
              maximumDate={today}
              helper={dateWarning ? 'Confira a data' : undefined}
              error={fieldError('date')}
              disabled={busy}
              testID="date-field"
            />
            {origin('date') === 'ocr' && s.date ? <SuggestionNote confidence={s.date.confidence} evidence={s.date.evidence} testID="date-suggestion" /> : null}
          </View>
          {textField('location', 'Local', location, setLocation)}
          {textField('professional', 'Profissional', professional, setProfessional)}
          {notesField}
        </View>

        <SectionHeader title="Encontramos no documento" />
        {items.length === 0 ? (
          <Text variant="subheadline" color="secondary" testID="review-nothing-found">
            {NOTHING_FOUND}
          </Text>
        ) : (
          <FoundItems
            items={items}
            onChange={(next) => {
              setItems(next);
              setItemErrors({});
            }}
            errors={itemErrors}
            recordDate={date}
            disabled={busy}
          />
        )}
        {hasLabs ? (
          <Text variant="footnote" color="secondary" style={{ marginTop: theme.space[4] }}>
            {A1}
          </Text>
        ) : null}
        <View style={{ marginTop: theme.space[6], alignItems: 'center' }}>
          <Button label="Descartar a leitura" variant="plain" onPress={() => setDiscarding(true)} disabled={busy} />
        </View>
        <ConfirmSheet
          visible={discarding}
          title="Descartar a leitura?"
          message="As sugestões e os itens encontrados saem desta tela. Os anexos e o que você digitou continuam."
          confirmLabel="Descartar a leitura"
          onCancel={() => setDiscarding(false)}
          onConfirm={discardReading}
        />
      </Screen>
    </HueProvider>
  );
}
