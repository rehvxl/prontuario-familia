import type { Consent, ConsentPurpose } from '../domain/consent';

export interface ConsentRow {
  purpose: ConsentPurpose;
  version: string;
  accepted_at: string;
  revoked_at: string | null;
}

export const CONSENT_COLUMNS = 'purpose,version,accepted_at,revoked_at';

export function mapConsent(row: ConsentRow): Consent {
  return { purpose: row.purpose, version: row.version, acceptedAt: row.accepted_at, revokedAt: row.revoked_at };
}
