import { LOCAL_COLLECTIONS, requireLocalUserId, type LocalDb } from '@/shared/lib';
import type { AuthUser, DataExportGateway } from '../domain/session';

interface OwnedDoc {
  id: string;
  ownerId?: string;
  userId?: string;
  familyId?: string;
}

/** Exportação do modo demonstração: JSON com o conteúdo local do usuário logado (anexos por caminho local). */
export function createLocalDataExportGateway(db: LocalDb): DataExportGateway {
  return {
    async exportMyData() {
      const userId = await requireLocalUserId(db);
      const user = await db.get<AuthUser>(LOCAL_COLLECTIONS.users, userId);
      const families = (await db.list<OwnedDoc>(LOCAL_COLLECTIONS.families)).filter((f) => f.ownerId === userId);
      const familyIds = new Set(families.map((f) => f.id));
      const inMyFamilies = (d: OwnedDoc) => d.familyId !== undefined && familyIds.has(d.familyId);
      const [members, records, consents, measurements, vaccineDoses, medications, vaccineRuleDismissals, emergencyCards] = await Promise.all([
        db.list<OwnedDoc>(LOCAL_COLLECTIONS.members),
        db.list<OwnedDoc>(LOCAL_COLLECTIONS.records),
        db.list<OwnedDoc>(LOCAL_COLLECTIONS.consents),
        db.list<OwnedDoc>(LOCAL_COLLECTIONS.measurements),
        db.list<OwnedDoc>(LOCAL_COLLECTIONS.vaccineDoses),
        db.list<OwnedDoc>(LOCAL_COLLECTIONS.medications),
        db.list<OwnedDoc>(LOCAL_COLLECTIONS.vaccineRuleDismissals),
        db.list<OwnedDoc>(LOCAL_COLLECTIONS.emergencyCards),
      ]);
      return JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          // Mesma versão e a mesma chave da ficha que a Edge Function (`emergency_cards`, sem `created_by`).
          format_version: 3,
          source: 'demo',
          user,
          consents: consents.filter((c) => c.userId === userId),
          families,
          members: members.filter(inMyFamilies),
          records: records.filter(inMyFamilies),
          // Itens no nível de cima, como na Edge Function (spec P6): os manuais não têm documento de origem.
          measurements: measurements.filter(inMyFamilies),
          vaccineDoses: vaccineDoses.filter(inMyFamilies),
          medications: medications.filter(inMyFamilies),
          vaccineRuleDismissals: vaccineRuleDismissals.filter(inMyFamilies),
          emergency_cards: emergencyCards.filter(inMyFamilies),
        },
        null,
        2,
      );
    },
  };
}
