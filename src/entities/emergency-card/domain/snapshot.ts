import type { EmergencyCard } from './schema';

/** Identificação mínima para reler a ficha sem rede. A entity não importa `member`. */
export interface EmergencyIdentitySnapshot {
  fullName: string;
  birthDate: string | null;
  relationship: string;
  sex: string;
}

/** Remédio ativo no momento do snapshot, com a origem já em texto. */
export interface EmergencyMedicationSnapshot {
  id: string;
  name: string;
  dosage: string | null;
  instructions: string | null;
  startOn: string;
  endOn: string | null;
  origin: string;
}

/** Leitura cifrada. `card: null` é o vazio conhecido; ausência de snapshot não é isto. */
export interface EmergencyReadSnapshot {
  card: EmergencyCard | null;
  identity: EmergencyIdentitySnapshot;
  medications: EmergencyMedicationSnapshot[];
  cachedAt: string;
}
