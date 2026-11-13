import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { BLOOD_TYPES, BLOOD_TYPE_LABELS, type BloodType } from '@/entities/emergency-card';
import { MedicationRow } from '@/entities/medication';
import {
  Banner,
  Button,
  Checkbox,
  ConfirmSheet,
  IconButton,
  ListSection,
  Select,
  Text,
  TextField,
  useTheme,
} from '@/shared/ui';
import { contactError, type EmergencyCardFormValues } from '../domain/form';
import { firstName, personDetail, typePhone, type AssembledMedication, type AssembleMember } from '../domain/assemble';

const BLOOD_OPTIONS = BLOOD_TYPES.map((value) => ({ value, label: BLOOD_TYPE_LABELS[value] }));

export function EmergencyCardForm({
  identity,
  initial,
  medications,
  offline,
  saving,
  error,
  onSave,
  onEditMedications,
  onDirtyChange,
}: {
  identity: AssembleMember;
  initial: EmergencyCardFormValues;
  medications: AssembledMedication[];
  offline: boolean;
  saving: boolean;
  error: string | null;
  onSave(values: EmergencyCardFormValues): void;
  onEditMedications(): void;
  onDirtyChange?(dirty: boolean): void;
}) {
  const theme = useTheme();
  const [values, setValues] = useState(initial);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showContactErrors, setShowContactErrors] = useState(false);
  const name = firstName(identity.fullName);
  const gap = { marginTop: theme.layout.fieldGap };

  const set = (patch: Partial<EmergencyCardFormValues>) => setValues((current) => ({ ...current, ...patch }));

  useEffect(() => {
    onDirtyChange?.(JSON.stringify(values) !== JSON.stringify(initial));
  }, [values, initial, onDirtyChange]);

  const toggleNoKnown = (checked: boolean) => {
    if (checked && values.allergies.some((item) => item.name.trim() || item.reaction.trim())) {
      setConfirmClear(true);
      return;
    }
    set({ noKnownAllergies: checked });
  };

  const save = () => {
    const issue = values.contacts.some((contact) => contactError(contact));
    if (issue) {
      setShowContactErrors(true);
      return;
    }
    onSave(values);
  };

  return (
    <View>
      {offline ? <Banner tone="warning" icon="offline" message="Sem conexão: a ficha está em modo leitura." /> : null}
      {error ? <Banner tone="danger" message={error} /> : null}
      <Text variant="headline">{identity.fullName}</Text>
      <Text variant="subheadline" color="secondary" style={{ marginTop: theme.space[1] }}>
        {personDetail(identity)}
      </Text>

      <View style={gap}>
        <Select label="Tipo sanguíneo" options={BLOOD_OPTIONS} value={values.bloodType} onChange={(bloodType: BloodType) => set({ bloodType })} />
      </View>

      <View style={gap}>
        <Checkbox
          label="Sem alergias conhecidas"
          description={`Marque esta opção se ${name} não tem alergias que vocês conheçam. É diferente de deixar a lista em branco.`}
          checked={values.noKnownAllergies}
          onChange={toggleNoKnown}
        />
      </View>

      {values.noKnownAllergies
        ? null
        : values.allergies.map((item, index) => (
            <View key={`allergy-${index}`} style={gap}>
              <TextField
                label="Alergia"
                value={item.name}
                placeholder="Exemplos: Dipirona, amendoim"
                onChangeText={(text) => {
                  const allergies = values.allergies.map((row, i) => (i === index ? { ...row, name: text } : row));
                  set({ allergies, noKnownAllergies: false });
                }}
              />
              <TextField
                label="Reação"
                optional
                value={item.reaction}
                placeholder="Opcional. Exemplos: urticária, falta de ar"
                onChangeText={(text) => {
                  const allergies = values.allergies.map((row, i) => (i === index ? { ...row, reaction: text } : row));
                  set({ allergies });
                }}
              />
              <IconButton
                icon="trash"
                accessibilityLabel="Remover alergia"
                onPress={() => set({ allergies: values.allergies.filter((_, i) => i !== index) })}
              />
            </View>
          ))}
      {values.noKnownAllergies ? null : (
        <Button
          label="Adicionar alergia"
          variant="bordered"
          onPress={() => set({ allergies: [...values.allergies, { name: '', reaction: '' }], noKnownAllergies: false })}
          style={gap}
        />
      )}

      {values.conditions.map((item, index) => (
        <View key={`condition-${index}`} style={gap}>
          <TextField
            label="Condição"
            value={item.name}
            onChangeText={(text) => set({ conditions: values.conditions.map((row, i) => (i === index ? { name: text } : row)) })}
          />
          <IconButton
            icon="trash"
            accessibilityLabel="Remover condição"
            onPress={() => set({ conditions: values.conditions.filter((_, i) => i !== index) })}
          />
        </View>
      ))}
      <Button
        label="Adicionar condição"
        variant="bordered"
        onPress={() => set({ conditions: [...values.conditions, { name: '' }] })}
        style={gap}
      />

      <View style={gap}>
        <Text variant="subheadline" color="secondary">
          {`Estes remédios vêm do cadastro de ${name}. Para incluir ou encerrar um, use a tela de remédios.`}
        </Text>
        {medications.length > 0 ? (
          <ListSection>
            {medications.map((med) => (
              <MedicationRow key={med.id} name={med.name} dosage={med.dosage} instructions={med.instructions} startOn={med.startOn} endOn={med.endOn} status="active" origin={med.origin} />
            ))}
          </ListSection>
        ) : null}
        <Button label="Editar remédios" variant="bordered" onPress={onEditMedications} />
      </View>

      <Text variant="subheadline" color="secondary" style={gap}>
        Você pode adicionar até 3 contatos. O telefone abre o discador do aparelho; o app não liga sozinho.
      </Text>
      {values.contacts.map((item, index) => {
        const message = showContactErrors ? contactError(item) : null;
        return (
          <View key={`contact-${index}`} style={gap}>
            <TextField label="Nome" value={item.name} error={message && !item.name.trim() ? message : null} onChangeText={(text) => set({ contacts: values.contacts.map((row, i) => (i === index ? { ...row, name: text } : row)) })} />
            <TextField label="Relação" optional value={item.relation} onChangeText={(text) => set({ contacts: values.contacts.map((row, i) => (i === index ? { ...row, relation: text } : row)) })} />
            <TextField
              label="Telefone"
              value={item.phone}
              keyboardType="phone-pad"
              error={message && !item.phone.trim() ? message : null}
              onChangeText={(text) => set({ contacts: values.contacts.map((row, i) => (i === index ? { ...row, phone: typePhone(row.phone, text) } : row)) })}
            />
            <IconButton icon="trash" accessibilityLabel="Remover contato" onPress={() => set({ contacts: values.contacts.filter((_, i) => i !== index) })} />
          </View>
        );
      })}
      <Button
        label="Adicionar contato"
        variant="bordered"
        disabled={values.contacts.length >= 3}
        onPress={() => set({ contacts: [...values.contacts, { name: '', relation: '', phone: '' }] })}
        style={gap}
      />

      <TextField
        label="Observações"
        optional
        multiline
        maxLength={280}
        value={values.notes}
        helper={`${values.notes.length} de 280`}
        onChangeText={(notes) => set({ notes })}
        containerStyle={gap}
      />

      <Button label="Salvar ficha" loading={saving} disabled={offline || saving} onPress={save} fullWidth style={{ marginTop: theme.layout.sectionGap }} />

      <ConfirmSheet
        visible={confirmClear}
        title="Apagar as alergias listadas?"
        message="Ao marcar “Sem alergias conhecidas”, as alergias que você escreveu serão removidas desta ficha."
        confirmLabel="Apagar alergias e marcar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={() => {
          set({ allergies: [], noKnownAllergies: true });
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </View>
  );
}
