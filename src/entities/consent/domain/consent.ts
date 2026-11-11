/** Versão atual do Termo de Uso + Política de Privacidade. Incrementar exige novo aceite. */
export const CURRENT_TERMS_VERSION = '2026-11-v1';

export type ConsentPurpose = 'terms_and_privacy' | 'health_data_processing';

/** Consentimento específico e destacado para dado pessoal sensível (LGPD art. 11, I). */
export interface Consent {
  purpose: ConsentPurpose;
  version: string;
  acceptedAt: string;
  revokedAt: string | null;
}

export interface ConsentRepository {
  listMine(): Promise<Consent[]>;
  accept(purpose: ConsentPurpose, version: string): Promise<Consent>;
  revoke(purpose: ConsentPurpose): Promise<void>;
}

export const REQUIRED_PURPOSES: readonly ConsentPurpose[] = ['terms_and_privacy', 'health_data_processing'];

export function hasValidConsent(consents: Consent[], version = CURRENT_TERMS_VERSION): boolean {
  return REQUIRED_PURPOSES.every((p) =>
    consents.some((c) => c.purpose === p && c.version === version && c.revokedAt === null),
  );
}
