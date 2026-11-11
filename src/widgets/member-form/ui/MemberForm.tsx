import { useState } from 'react';
import { View } from 'react-native';
import { isDomainError } from '@/shared/lib';
import { Banner, Button, DateField, Select, TextField, errorMessage, toISODate, useTheme } from '@/shared/ui';
import { RELATIONSHIPS, RELATIONSHIP_LABELS, SEXES, SEX_LABELS, type Relationship, type Sex } from '@/entities/member';

export interface MemberFormValues {
  fullName: string;
  birthDate: string | null;
  relationship: Relationship;
  sex: Sex;
}

export interface MemberFormProps {
  initial?: Partial<MemberFormValues>;
  submitLabel: string;
  submitting?: boolean;
  /** Erro da última tentativa (mutation): erros de campo vão no campo, o resto num banner. */
  error?: unknown;
  onSubmit: (values: MemberFormValues) => void;
}

const relationshipOptions = RELATIONSHIPS.map((value) => ({ value, label: RELATIONSHIP_LABELS[value] }));
const sexOptions = SEXES.map((value) => ({ value, label: SEX_LABELS[value] }));

const NAME_CODES = ['member/invalid-name'];
const BIRTH_CODES = ['member/invalid-birth-date', 'member/future-birth-date'];

/** Campos de uma pessoa da família (nova ou edição). Valida ao enviar; as regras finais são as do caso de uso. */
export function MemberForm({ initial, submitLabel, submitting = false, error, onSubmit }: MemberFormProps) {
  const theme = useTheme();
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [birthDate, setBirthDate] = useState<string | null>(initial?.birthDate ?? null);
  const [relationship, setRelationship] = useState<Relationship | null>(initial?.relationship ?? null);
  const [sex, setSex] = useState<Sex>(initial?.sex ?? 'unspecified');
  const [attempted, setAttempted] = useState(false);

  const code = isDomainError(error) ? error.code : null;
  const nameError = attempted && fullName.trim().length < 2 ? 'Informe o nome da pessoa.' : code && NAME_CODES.includes(code) ? errorMessage(error) : undefined;
  const birthError = code && BIRTH_CODES.includes(code) ? errorMessage(error) : undefined;
  const relationshipError = attempted && relationship === null ? 'Escolha o parentesco.' : undefined;
  const bannerError = error && !nameError && !birthError ? errorMessage(error, 'Não foi possível salvar. Tente novamente.') : null;

  const submit = () => {
    setAttempted(true);
    if (fullName.trim().length < 2 || relationship === null) return;
    onSubmit({ fullName, birthDate, relationship, sex });
  };

  return (
    <View style={{ gap: theme.layout.fieldGap }}>
      {bannerError ? <Banner tone="danger" message={bannerError} /> : null}
      <TextField
        label="Nome"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        error={nameError}
        testID="member-name"
      />
      <DateField
        label="Data de nascimento"
        optional
        clearable
        value={birthDate}
        onChange={setBirthDate}
        maximumDate={toISODate(new Date())}
        error={birthError}
      />
      <Select label="Parentesco" options={relationshipOptions} value={relationship} onChange={setRelationship} placeholder="Escolher parentesco" error={relationshipError} />
      <Select label="Sexo" optional options={sexOptions} value={sex} onChange={setSex} />
      <Button label={submitLabel} onPress={submit} loading={submitting} fullWidth />
    </View>
  );
}

