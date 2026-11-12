import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { isDomainError } from '@/shared/lib';
import { Avatar, Banner, Icon, Button, DateField, Select, Text, TextField, errorMessage, getInitials, toISODate, useTheme } from '@/shared/ui';
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
  /**
   * Id da pessoa na edição: a prévia sai na cor da divisória dela. Sem id (nova), a prévia fica neutra: a cor
   * sai do id criado ao salvar, e mostrar outra antes seria prometer a divisória errada.
   */
  avatarId?: string;
}

const relationshipOptions = RELATIONSHIPS.map((value) => ({ value, label: RELATIONSHIP_LABELS[value] }));
const sexOptions = SEXES.map((value) => ({ value, label: SEX_LABELS[value] }));

const NAME_CODES = ['member/invalid-name'];
const BIRTH_CODES = ['member/invalid-birth-date', 'member/future-birth-date'];

/** Dica da data de nascimento (DESIGN_SYSTEM.md §7.13): na v0.2 ela calcula o calendário de vacinas (spec F3, R13). */
export const BIRTH_DATE_HINT = 'Usada para o calendário de vacinas';

/**
 * Campos de uma pessoa da família (nova ou edição). Valida ao enviar; as regras finais são as do caso de uso.
 * A capa da pessoa com as iniciais aparece ao digitar o nome.
 */
export function MemberForm({ initial, submitLabel, submitting = false, error, onSubmit, avatarId }: MemberFormProps) {
  const theme = useTheme();
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [birthDate, setBirthDate] = useState<string | null>(initial?.birthDate ?? null);
  const [relationship, setRelationship] = useState<Relationship | null>(initial?.relationship ?? null);
  const [sex, setSex] = useState<Sex>(initial?.sex ?? 'unspecified');
  const [attempted, setAttempted] = useState(false);

  const preview = fullName.trim();
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
      {/* Prévia sempre presente (sem empurrar o campo ao digitar); decorativa: o nome já está no campo. */}
      <View style={[styles.preview, { gap: theme.space[3] }]} testID="member-avatar-preview" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {preview && avatarId ? (
          <Avatar name={preview} id={avatarId} size="lg" />
        ) : (
          // Capa ainda sem divisória, no mesmo recorte do `Avatar` lg (cantos de aba à direita).
          <View style={[styles.placeholder, { backgroundColor: theme.colors.surfaceSunken }]}>
            {preview ? (
              <Text allowFontScaling={false} color="secondary" style={styles.initials}>
                {getInitials(preview)}
              </Text>
            ) : (
              <Icon name="person" size={26} color="textSecondary" />
            )}
          </View>
        )}
        <Text variant="title3" color={preview ? 'primary' : 'secondary'} style={styles.flex}>
          {preview || 'Nova pessoa'}
        </Text>
      </View>
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
        helper={BIRTH_DATE_HINT}
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

const styles = StyleSheet.create({
  preview: { flexDirection: 'row', alignItems: 'center' },
  placeholder: {
    width: 56,
    height: 56,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 22, lineHeight: 26, fontWeight: '700' },
  flex: { flex: 1 },
});
