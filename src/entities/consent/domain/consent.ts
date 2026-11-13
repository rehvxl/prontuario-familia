/**
 * Versão que o onboarding e o aceite novo gravam.
 * v3 (ficha de emergência): alergias, tipo sanguíneo, condições, contatos e exibição no aparelho.
 * Rascunho do texto: revisão do Douglas no PR, antes de qualquer publicação.
 */
export const CURRENT_TERMS_VERSION = '2026-11-v3';

/** Versões que autorizam o uso do app (exceto a ficha de emergência). A v1 não entra. */
export const APP_CONSENT_VERSIONS = ['2026-11-v2', '2026-11-v3'] as const;

/** Versão exigida para usar a ficha de emergência. */
export const EMERGENCY_CARD_TERMS_VERSION = '2026-11-v3';

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

/** As duas finalidades ativas na versão pedida (padrão: a atual, v3). */
export function hasValidConsent(consents: Consent[], version = CURRENT_TERMS_VERSION): boolean {
  return REQUIRED_PURPOSES.every((p) => consents.some((c) => c.purpose === p && c.version === version && c.revokedAt === null));
}

/** As duas finalidades ativas em v2 ou em v3. Autoriza o resto do app; não autoriza a ficha. */
export function hasValidAppConsent(consents: Consent[]): boolean {
  return APP_CONSENT_VERSIONS.some((version) => hasValidConsent(consents, version));
}

/** As duas finalidades ativas na v3. Única porta da ficha de emergência. */
export function hasEmergencyCardConsent(consents: Consent[]): boolean {
  return hasValidConsent(consents, EMERGENCY_CARD_TERMS_VERSION);
}
