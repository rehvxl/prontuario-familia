import { formatAge, relationshipLabel, RELATIONSHIPS, SEXES, type Relationship, type Sex } from '@/entities/member';
import { medicationStatus } from '@/entities/medication';
import type { EmergencyCard } from '@/entities/emergency-card';
import { formatShortDate } from '@/shared/lib';

export interface AssembleMember {
  fullName: string;
  birthDate: string | null;
  relationship: string;
  sex: string;
}

export interface AssembleMedication {
  id: string;
  name: string;
  dosage: string | null;
  instructions: string | null;
  startOn: string;
  endOn: string | null;
  sourceRecordId: string | null;
}

export interface AssembledMedication {
  id: string;
  name: string;
  dosage: string | null;
  instructions: string | null;
  startOn: string;
  endOn: string | null;
  origin: string;
}

export interface AssembledEmergencyCard {
  card: EmergencyCard | null;
  identity: AssembleMember;
  medications: AssembledMedication[];
}

const isRelationship = (value: string): value is Relationship => (RELATIONSHIPS as readonly string[]).includes(value);
const isSex = (value: string): value is Sex => (SEXES as readonly string[]).includes(value);

/** "Mãe · 67 anos". Sem data de nascimento, a idade não é inventada. */
export function personDetail(identity: AssembleMember, today: Date = new Date()): string {
  const relationship = isRelationship(identity.relationship) ? relationshipLabel(identity.relationship, isSex(identity.sex) ? identity.sex : undefined) : identity.relationship;
  const age = formatAge(identity.birthDate, today);
  return [relationship, age].filter(Boolean).join(' · ');
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

/** Data local de um timestamptz, para o `formatDate` que só aceita YYYY-MM-DD. */
export function calendarDay(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return '';
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function medicationOrigin(sourceRecordId: string | null, record?: { title: string; date: string } | null): string {
  if (!sourceRecordId) return 'Registrado por você';
  if (!record) return 'Do documento de origem';
  return `Do documento ${record.title}, ${formatShortDate(record.date)}`;
}

/** Só remédios em uso. Encerrar ou agendar tira o item da ficha. */
export function assembleEmergencyCard(
  member: AssembleMember,
  card: EmergencyCard | null,
  medications: readonly AssembleMedication[],
  today: string,
  records: ReadonlyMap<string, { title: string; date: string }> = new Map(),
): AssembledEmergencyCard {
  const active = medications
    .filter((med) => medicationStatus(med, today) === 'active')
    .map((med) => ({
      id: med.id,
      name: med.name,
      dosage: med.dosage,
      instructions: med.instructions,
      startOn: med.startOn,
      endOn: med.endOn,
      origin: medicationOrigin(med.sourceRecordId, med.sourceRecordId ? records.get(med.sourceRecordId) : null),
    }));
  return { card, identity: member, medications: active };
}

/** URI do discador. O app não liga. */
export function emergencyPhoneUrl(phone: string): string {
  const compact = phone.trim().replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  return `tel:${compact}`;
}

function formatNational(d: string): string {
  // Códigos curtos (192, 190) e 0800 ficam como digitados.
  if (d.length <= 4 || d.startsWith('0') || d.length > 11) return d;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  const split = d.length === 11 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

/** Máscara brasileira: (61) 99999-0000, (61) 3333-0000 e +55 (61) 99999-0000. Outro DDI fica só com os dígitos. */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!value.trim().startsWith('+')) return formatNational(digits);
  if (digits.startsWith('55') && digits.length > 2) return `+55 ${formatNational(digits.slice(2))}`;
  return `+${digits}`;
}

/** Máscara ao digitar. Apagar só um caractere da máscara apaga também o dígito anterior, senão o hífen volta e trava. */
export function typePhone(previous: string, next: string): string {
  const digits = (text: string) => text.replace(/\D/g, '');
  if (next.length < previous.length && digits(next) === digits(previous)) {
    const d = digits(next).slice(0, -1);
    return formatPhone(next.trim().startsWith('+') ? `+${d}` : d);
  }
  return formatPhone(next);
}
