import { REQUIRED_PURPOSES, type Consent, type ConsentRepository } from '@/entities/consent';

/**
 * Revoga os consentimentos obrigatórios (LGPD art. 8º, §5º: revogável a qualquer momento).
 * Sem eles o app não trata dados de saúde: a guarda leva o usuário de volta ao aceite. Devolve os consentimentos após a revogação.
 */
export async function revokeConsents({ consents }: { consents: ConsentRepository }): Promise<Consent[]> {
  for (const purpose of REQUIRED_PURPOSES) await consents.revoke(purpose);
  return consents.listMine();
}
