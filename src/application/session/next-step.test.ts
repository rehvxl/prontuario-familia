import type { Consent } from '@/entities/consent';
import { CURRENT_TERMS_VERSION } from '@/entities/consent';
import type { Family } from '@/entities/family';
import type { AuthUser } from '@/entities/session';
import { STEP_ENTRY_ROUTE, STEP_ROUTE_GROUP, isRouteInStep, resolveNextStep, type NextStep } from './next-step';

const user: AuthUser = { id: 'u', email: 'a@b.com', displayName: null, provider: 'email' };
const family: Family = { id: 'f', name: 'Souza', createdAt: 'x', myRole: 'owner' };
const valid = (purpose: Consent['purpose']): Consent => ({ purpose, version: CURRENT_TERMS_VERSION, acceptedAt: 'x', revokedAt: null });
const allValid: Consent[] = [valid('terms_and_privacy'), valid('health_data_processing')];

describe('resolveNextStep', () => {
  it('sem sessão: consentimento no aparelho decide entre consent e sign-in', () => {
    expect(resolveNextStep({ user: null, consents: null, family: null, deviceConsent: false })).toBe('consent');
    expect(resolveNextStep({ user: null, consents: null, family: null, deviceConsent: true })).toBe('sign-in');
  });

  it('sem sessão ignora consentimentos e família que sobraram em cache', () => {
    expect(resolveNextStep({ user: null, consents: allValid, family, deviceConsent: false })).toBe('consent');
  });

  it('logado sem consentimentos válidos volta para consent, mesmo com aceite no aparelho', () => {
    expect(resolveNextStep({ user, consents: null, family: null, deviceConsent: true })).toBe('consent');
    expect(resolveNextStep({ user, consents: [], family, deviceConsent: true })).toBe('consent');
    expect(resolveNextStep({ user, consents: [valid('terms_and_privacy')], family, deviceConsent: true })).toBe('consent');
  });

  it('consentimento de versão antiga ou revogado exige novo aceite', () => {
    const stale: Consent[] = [
      { ...valid('terms_and_privacy'), version: 'v0' },
      valid('health_data_processing'),
    ];
    const revoked: Consent[] = [{ ...valid('terms_and_privacy'), revokedAt: 'y' }, valid('health_data_processing')];
    expect(resolveNextStep({ user, consents: stale, family, deviceConsent: false })).toBe('consent');
    expect(resolveNextStep({ user, consents: revoked, family, deviceConsent: false })).toBe('consent');
  });

  it('logado e consentido: família decide entre family e main', () => {
    expect(resolveNextStep({ user, consents: allValid, family: null, deviceConsent: false })).toBe('family');
    expect(resolveNextStep({ user, consents: allValid, family, deviceConsent: false })).toBe('main');
  });
});

describe('guarda de rotas', () => {
  const steps: NextStep[] = ['consent', 'sign-in', 'family', 'main'];

  it('toda etapa tem rota de entrada dentro do próprio grupo', () => {
    for (const step of steps) {
      const group = STEP_ENTRY_ROUTE[step].split('/')[1];
      expect(isRouteInStep(step, group)).toBe(true);
    }
  });

  it('um grupo de rotas pertence a uma única etapa', () => {
    for (const step of steps) {
      for (const group of STEP_ROUTE_GROUP[step]) {
        expect(steps.filter((s) => isRouteInStep(s, group))).toEqual([step]);
      }
    }
  });

  it('segmento ausente ou desconhecido não pertence a nenhuma etapa', () => {
    for (const step of steps) {
      expect(isRouteInStep(step, undefined)).toBe(false);
      expect(isRouteInStep(step, '(outro)')).toBe(false);
    }
  });
});
