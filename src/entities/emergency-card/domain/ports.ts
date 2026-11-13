import type { EmergencyCard, EmergencyCardDraft } from './schema';

export interface EmergencyCardRepository {
  getByMember(memberId: string): Promise<EmergencyCard | null>;
  /** Cria se não houver linha. Nenhum campo é obrigatório. */
  upsert(memberId: string, familyId: string, draft: EmergencyCardDraft): Promise<EmergencyCard>;
  removeByMember(memberId: string): Promise<void>;
}
