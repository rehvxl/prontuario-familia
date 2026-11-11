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
      const [members, records, consents] = await Promise.all([
        db.list<OwnedDoc>(LOCAL_COLLECTIONS.members),
        db.list<OwnedDoc>(LOCAL_COLLECTIONS.records),
        db.list<OwnedDoc>(LOCAL_COLLECTIONS.consents),
      ]);
      return JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          source: 'demo',
          user,
          consents: consents.filter((c) => c.userId === userId),
          families,
          members: members.filter(inMyFamilies),
          records: records.filter(inMyFamilies),
        },
        null,
        2,
      );
    },
  };
}
