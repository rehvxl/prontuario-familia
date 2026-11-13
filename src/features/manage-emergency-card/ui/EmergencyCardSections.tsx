import { Linking, View } from 'react-native';
import { MedicationRow } from '@/entities/medication';
import { BLOOD_TYPE_LABELS, type EmergencyCard } from '@/entities/emergency-card';
import { Button, ListItem, ListSection, SectionHeader, Text, useTheme } from '@/shared/ui';
import { emergencyPhoneUrl, firstName, formatPhone, personDetail, type AssembledEmergencyCard } from '../domain/assemble';

const LEGAL = 'Informações declaradas pela família. Não substituem avaliação médica.';

export function legalFooter(card: EmergencyCard | null, updatedLabel: string | null): string {
  if (!card || !updatedLabel) return LEGAL;
  return `${LEGAL} Atualizada em ${updatedLabel}.`;
}

function contactLabel(name: string, relation: string | null, phone: string): string {
  return `Ligar para ${name}${relation ? `, ${relation}` : ''}, ${phone}. Abre o discador do aparelho.`;
}

export function EmergencyCardSections({
  view,
  mode,
  onEditMedications,
}: {
  view: AssembledEmergencyCard;
  mode: 'read' | 'present';
  onEditMedications?: () => void;
}) {
  const theme = useTheme();
  const card = view.card;
  const present = mode === 'present';
  const name = firstName(view.identity.fullName);
  const gap = { marginTop: theme.layout.sectionGap };

  const allergyBody = () => {
    if (card?.noKnownAllergies) {
      return <Text variant={present ? 'bodyStrong' : 'body'}>Sem alergias conhecidas</Text>;
    }
    if (!card || card.allergies.length === 0) {
      return (
        <Text variant={present ? 'bodyStrong' : 'body'} color={present ? 'primary' : 'secondary'}>
          Alergias não informadas
        </Text>
      );
    }
    if (present) {
      return card.allergies.map((item, index) => (
        <View key={`${index}-${item.name}`} style={{ marginTop: theme.space[3] }}>
          <Text variant="title1">{item.name}</Text>
          {item.reaction ? <Text variant="bodyStrong">{item.reaction}</Text> : null}
        </View>
      ));
    }
    return (
      <ListSection>
        {card.allergies.map((item, index) => (
          <ListItem key={`${index}-${item.name}`} title={item.name} subtitle={item.reaction ?? undefined} />
        ))}
      </ListSection>
    );
  };

  return (
    <View>
      <Text variant={present ? 'largeTitle' : 'title1'} accessibilityRole="header">
        {view.identity.fullName}
      </Text>
      <Text variant="subheadline" color="secondary" style={{ marginTop: theme.space[1] }}>
        {personDetail(view.identity)}
      </Text>

      <View style={gap}>
        {present ? (
          <Text variant="title2" accessibilityRole="header">
            Alergias
          </Text>
        ) : (
          <SectionHeader title="Alergias" />
        )}
        {allergyBody()}
      </View>

      <View style={gap}>
        <SectionHeader title="Condições de saúde informadas" />
        {card && card.conditions.length > 0 ? (
          <ListSection>
            {card.conditions.map((item, index) => (
              <ListItem key={`${index}-${item.name}`} title={item.name} />
            ))}
          </ListSection>
        ) : (
          <Text variant="body" color="secondary">
            Nenhuma condição informada
          </Text>
        )}
      </View>

      <View style={gap}>
        <SectionHeader
          title="Remédios em uso"
          action={!present && onEditMedications ? { label: 'Editar remédios', onPress: onEditMedications } : undefined}
        />
        {view.medications.length > 0 ? (
          <ListSection>
            {view.medications.map((med) => (
              <MedicationRow
                key={med.id}
                name={med.name}
                dosage={med.dosage}
                instructions={med.instructions}
                startOn={med.startOn}
                endOn={med.endOn}
                status="active"
                origin={med.origin}
              />
            ))}
          </ListSection>
        ) : (
          <View>
            <Text variant="body" color="secondary">
              Nenhum medicamento em uso cadastrado.
            </Text>
            {!present && onEditMedications ? (
              <Button label={`Abrir remédios de ${name}`} variant="bordered" onPress={onEditMedications} style={{ marginTop: theme.space[3] }} />
            ) : null}
          </View>
        )}
      </View>

      <View style={gap}>
        <ListSection>
          <ListItem title="Tipo sanguíneo" subtitle={card ? BLOOD_TYPE_LABELS[card.bloodType] : BLOOD_TYPE_LABELS.unknown} />
        </ListSection>
      </View>

      <View style={gap}>
        <SectionHeader title="Contatos de emergência" />
        {card && card.contacts.length > 0 ? (
          <ListSection>
            {card.contacts.map((contact) => (
              <ListItem
                key={`${contact.name}-${contact.phone}`}
                title={contact.name}
                subtitle={contact.relation ?? undefined}
                meta={formatPhone(contact.phone)}
                onPress={() => void Linking.openURL(emergencyPhoneUrl(contact.phone))}
                accessibilityLabel={contactLabel(contact.name, contact.relation, formatPhone(contact.phone))}
              />
            ))}
          </ListSection>
        ) : (
          <Text variant="body" color="secondary">
            Nenhum contato informado.
          </Text>
        )}
      </View>

      {card?.notes ? (
        <View style={gap}>
          <SectionHeader title="Observações" />
          <Text variant="body">{card.notes}</Text>
        </View>
      ) : null}
    </View>
  );
}
