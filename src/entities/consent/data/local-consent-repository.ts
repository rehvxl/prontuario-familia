import { LOCAL_COLLECTIONS, getLocalUserId, requireLocalUserId, type LocalDb } from '@/shared/lib';
import type { Consent, ConsentRepository } from '../domain/consent';

type ConsentDoc = Consent & { userId: string };

const docId = (userId: string, purpose: string) => `${userId}:${purpose}`;
const toConsent = ({ purpose, version, acceptedAt, revokedAt }: ConsentDoc): Consent => ({ purpose, version, acceptedAt, revokedAt });

/** Consentimentos por usuário no modo demonstração (espelha a tabela `consents`, que exige usuário logado). */
export function createLocalConsentRepository(db: LocalDb): ConsentRepository {
  return {
    async listMine() {
      const userId = await getLocalUserId(db);
      if (userId === null) return [];
      return (await db.list<ConsentDoc>(LOCAL_COLLECTIONS.consents)).filter((c) => c.userId === userId).map(toConsent);
    },

    async accept(purpose, version) {
      const userId = await requireLocalUserId(db);
      const doc: ConsentDoc = { userId, purpose, version, acceptedAt: new Date().toISOString(), revokedAt: null };
      await db.put(LOCAL_COLLECTIONS.consents, docId(userId, purpose), doc);
      return toConsent(doc);
    },

    async revoke(purpose) {
      const userId = await requireLocalUserId(db);
      const doc = await db.get<ConsentDoc>(LOCAL_COLLECTIONS.consents, docId(userId, purpose));
      if (doc && doc.revokedAt === null) {
        await db.put(LOCAL_COLLECTIONS.consents, docId(userId, purpose), { ...doc, revokedAt: new Date().toISOString() });
      }
    },
  };
}
