import type { Consent } from '@/entities/consent';
import { CURRENT_TERMS_VERSION } from '@/entities/consent';
import type { Family } from '@/entities/family';
import type { AuthUser } from '@/entities/session';
import { hasDeviceConsent } from './device-consent';
import { STEP_ENTRY_ROUTE, STEP_ROUTE_GROUP, entryRouteFor, isRouteInStep, resolveNextStep, type NextStep } from './next-step';

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

  it('termo v2: aceite da v1 (2026-11-v1) não vale mais, nem no repositório nem no aparelho', () => {
    const v1: Consent[] = allValid.map((c) => ({ ...c, version: '2026-11-v1' }));
    expect(resolveNextStep({ user, consents: v1, family, deviceConsent: true })).toBe('consent');
    expect(resolveNextStep({ user: null, consents: null, family: null, deviceConsent: hasDeviceConsent('2026-11-v1') })).toBe('consent');
    expect(resolveNextStep({ user: null, consents: null, family: null, deviceConsent: hasDeviceConsent(CURRENT_TERMS_VERSION) })).toBe('sign-in');
  });

  it('logado e consentido: família decide entre family e main', () => {
    expect(resolveNextStep({ user, consents: allValid, family: null, deviceConsent: false })).toBe('family');
    expect(resolveNextStep({ user, consents: allValid, family, deviceConsent: false })).toBe('main');
  });
});

describe('entryRouteFor (BUG-09)', () => {
  it('instalação nova (sem sessão) entra pelo onboarding', () => {
    expect(entryRouteFor('consent', false)).toBe('/(onboarding)/welcome');
  });

  it('quem já tem sessão e volta ao consentimento (revogou) vai direto à tela de consentimento', () => {
    const step = resolveNextStep({ user, consents: [{ ...valid('terms_and_privacy'), revokedAt: 'y' }, valid('health_data_processing')], family, deviceConsent: false });
    expect(step).toBe('consent');
    expect(entryRouteFor(step, true)).toBe('/(onboarding)/consent');
    expect(isRouteInStep(step, entryRouteFor(step, true).split('/')[1])).toBe(true);
  });

  it('as outras etapas não mudam com a sessão', () => {
    for (const step of ['sign-in', 'family', 'main'] as const) {
      expect(entryRouteFor(step, true)).toBe(STEP_ENTRY_ROUTE[step]);
      expect(entryRouteFor(step, false)).toBe(STEP_ENTRY_ROUTE[step]);
    }
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
