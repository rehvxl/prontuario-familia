import { DomainError } from '@/shared/lib';
import {
  CURRENT_TERMS_VERSION,
  REQUIRED_PURPOSES,
  hasValidConsent,
  type Consent,
  type ConsentRepository,
} from '@/entities/consent';

export interface AcceptConsentsInput {
  /** Marcou "li e aceito os Termos de Uso e a Política de Privacidade". */
  termsAndPrivacy: boolean;
  /** Marcou o consentimento específico para tratar dados de saúde (LGPD art. 11, I). */
  healthData: boolean;
}

/** Exige as duas confirmações explícitas (consentimento específico e destacado, LGPD art. 11, I). */
export function assertExplicitConsent(input: AcceptConsentsInput): void {
  if (!input.termsAndPrivacy || !input.healthData) {
    throw new DomainError('consent/required', 'Para usar o app, aceite os Termos e o tratamento dos dados de saúde.');
  }
}

/**
 * Registra os dois consentimentos obrigatórios na versão atual. Exige as duas confirmações explícitas.
 * Idempotente: não regrava o que já está válido. Devolve os consentimentos do usuário após o aceite.
 */
export async function acceptRequiredConsents(
  { consents }: { consents: ConsentRepository },
  input: AcceptConsentsInput,
  version: string = CURRENT_TERMS_VERSION,
): Promise<Consent[]> {
  assertExplicitConsent(input);
  const current = await consents.listMine();
  for (const purpose of REQUIRED_PURPOSES) {
    const valid = current.some((c) => c.purpose === purpose && c.version === version && c.revokedAt === null);
    if (!valid) await consents.accept(purpose, version);
  }
  const after = await consents.listMine();
  if (!hasValidConsent(after, version)) {
    throw new DomainError('consent/not-saved', 'Não foi possível registrar seu aceite. Tente novamente.');
  }
  return after;
}
