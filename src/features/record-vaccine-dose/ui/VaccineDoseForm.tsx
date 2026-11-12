import { useState } from 'react';
import { View } from 'react-native';
import { isDomainError, toLocalIsoDate } from '@/shared/lib';
import { Banner, Button, Checkbox, DateField, Select, TextField, errorMessage, useTheme } from '@/shared/ui';
import { useMember } from '@/entities/member';
import { DOSE_KEYS, VACCINE_ALIASES, doseLabelOf, vaccineLabel, type DoseKey, type VaccineDose } from '@/entities/vaccine';
import { useRecordVaccineDose, useUpdateVaccineDose } from '../model/hooks';

export interface VaccineDoseFormProps {
  memberId: string;
  onSaved(): void;
  /** Dose a editar (padrão F2.9 / L8). Sem ela, registra uma dose nova. */
  dose?: VaccineDose;
}

// pcv13 e pcv15 são da rede privada e contam para a série pneumocócica (spec §13, L5); não estão nos aliases do OCR.
const VACCINE_OPTIONS = [
  ...[...VACCINE_ALIASES.map((v) => v.code), 'pcv13', 'pcv15']
    .map((code) => ({ value: code, label: vaccineLabel(code) }))
    .sort((x, y) => x.label.localeCompare(y.label, 'pt-BR')),
  { value: 'other', label: 'Outra' },
];
const DOSE_OPTIONS = DOSE_KEYS.map((key) => ({ value: key, label: doseLabelOf(key) }));

type Field = 'vaccine' | 'name' | 'dose' | 'date' | 'lot' | 'location';

const FIELD_CODES: Partial<Record<string, Field>> = {
  'vaccine/invalid-code': 'vaccine',
  'vaccine/missing-name': 'name',
  'vaccine/invalid-name': 'name',
  'vaccine/invalid-date': 'date',
  'vaccine/future-date': 'date',
  'vaccine/invalid-lot': 'lot',
  'vaccine/invalid-location': 'location',
};

/** F3.5: vacina (catálogo ou "Outra" com nome), dose, data ou "Não sei a data", lote e local opcionais. */
export function VaccineDoseForm({ memberId, onSaved, dose }: VaccineDoseFormProps) {
  const theme = useTheme();
  const familyId = useMember(memberId).data?.familyId;
  const record = useRecordVaccineDose();
  const update = useUpdateVaccineDose();
  const mutation = dose ? update : record;

  const [vaccineCode, setVaccineCode] = useState<string | null>(dose?.vaccineCode ?? null);
  const [vaccineName, setVaccineName] = useState(dose?.vaccineName ?? '');
  const [doseKey, setDoseKey] = useState<DoseKey | null>(dose?.doseKey ?? null);
  const [appliedOn, setAppliedOn] = useState<string | null>(dose?.appliedOn ?? null);
  const [unknownDate, setUnknownDate] = useState(dose ? dose.appliedOn === null : false);
  const [lot, setLot] = useState(dose?.lot ?? '');
  const [location, setLocation] = useState(dose?.location ?? '');
  const [attempted, setAttempted] = useState(false);

  const isOther = vaccineCode === 'other';
  const local: Record<Field, string | null> = {
    vaccine: vaccineCode === null ? 'Escolha a vacina.' : null,
    name: isOther && vaccineName.trim() === '' ? 'Digite o nome da vacina.' : null,
    dose: doseKey === null ? 'Escolha a dose.' : null,
    date: !unknownDate && appliedOn === null ? 'Escolha a data ou marque “Não sei a data”.' : null,
    lot: null,
    location: null,
  };
  const error = mutation.error;
  const field = isDomainError(error) ? FIELD_CODES[error.code] : undefined;
  const fieldError = (name: Field) => (attempted ? local[name] : null) ?? (field === name ? errorMessage(error) : null);
  const banner = error && !field ? errorMessage(error, 'Não foi possível salvar a dose. Tente novamente.') : null;

  const submit = () => {
    setAttempted(true);
    if (!familyId || vaccineCode === null || doseKey === null || Object.values(local).some(Boolean)) return;
    const values = {
      vaccineCode,
      vaccineName: isOther ? vaccineName : null,
      doseKey,
      appliedOn: unknownDate ? null : appliedOn,
      lot,
      location,
    };
    if (dose) {
      // O rótulo acompanha a dose escolhida; mantido quando a dose não muda (ex.: "Dose ao nascer").
      const doseLabel = doseKey === dose.doseKey ? dose.doseLabel : doseLabelOf(doseKey);
      update.mutate({ dose, changes: { ...values, doseLabel } }, { onSuccess: onSaved });
    } else {
      record.mutate(
        { ...values, familyId, memberId, doseLabel: '', sourceRecordId: null, origin: 'manual', lot: lot || null, location: location || null },
        { onSuccess: onSaved },
      );
    }
  };

  return (
    <View style={{ gap: theme.layout.fieldGap }}>
      {banner ? <Banner tone="danger" message={banner} /> : null}
      <Select label="Vacina" options={VACCINE_OPTIONS} value={vaccineCode} onChange={setVaccineCode} placeholder="Escolher vacina" error={fieldError('vaccine')} testID="dose-vaccine" />
      {isOther ? (
        <TextField label="Nome da vacina" value={vaccineName} onChangeText={setVaccineName} autoCapitalize="sentences" maxLength={120} error={fieldError('name')} testID="dose-vaccine-name" />
      ) : null}
      <Select label="Dose" options={DOSE_OPTIONS} value={doseKey} onChange={setDoseKey} placeholder="Escolher dose" error={fieldError('dose')} testID="dose-key" />
      <View style={{ gap: theme.space[2] }}>
        <DateField
          label="Data da aplicação"
          value={unknownDate ? null : appliedOn}
          onChange={setAppliedOn}
          minimumDate="1900-01-01"
          maximumDate={toLocalIsoDate()}
          disabled={unknownDate}
          error={fieldError('date')}
          testID="dose-date"
        />
        <Checkbox checked={unknownDate} onChange={setUnknownDate} label="Não sei a data" testID="dose-unknown-date" />
      </View>
      <TextField label="Lote" optional value={lot} onChangeText={setLot} autoCapitalize="characters" maxLength={40} error={fieldError('lot')} testID="dose-lot" />
      <TextField label="Local" optional value={location} onChangeText={setLocation} autoCapitalize="sentences" maxLength={200} error={fieldError('location')} testID="dose-location" />
      <Button label={dose ? 'Salvar alterações' : 'Salvar dose'} onPress={submit} loading={mutation.isPending} disabled={!familyId} fullWidth testID="dose-save" />
    </View>
  );
}
