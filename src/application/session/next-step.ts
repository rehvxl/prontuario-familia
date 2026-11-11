import { hasValidConsent, type Consent } from '@/entities/consent';
import type { Family } from '@/entities/family';
import type { AuthUser } from '@/entities/session';

/** Etapa em que o usuário está: consentimento → login → família → app principal (docs/ARCHITECTURE.md §4). */
export type NextStep = 'consent' | 'sign-in' | 'family' | 'main';

export interface NextStepInput {
  user: AuthUser | null;
  /** Consentimentos gravados para o usuário logado (ignorado sem sessão). */
  consents: Consent[] | null;
  family: Family | null;
  /** Aceite da versão atual dado neste aparelho antes do login (ver `device-consent`). */
  deviceConsent: boolean;
}

export function resolveNextStep({ user, consents, family, deviceConsent }: NextStepInput): NextStep {
  if (user === null) return deviceConsent ? 'sign-in' : 'consent';
  if (!consents || !hasValidConsent(consents)) return 'consent';
  return family === null ? 'family' : 'main';
}

/** Grupo de rotas do expo-router que atende cada etapa (para a guarda comparar com `useSegments()[0]`). */
export const STEP_ROUTE_GROUP: Readonly<Record<NextStep, readonly string[]>> = {
  consent: ['(onboarding)'],
  'sign-in': ['(auth)', 'auth'],
  family: ['(setup)'],
  main: ['(main)'],
};

/** Rota de entrada de cada etapa. */
export const STEP_ENTRY_ROUTE: Readonly<Record<NextStep, string>> = {
  consent: '/(onboarding)/welcome',
  'sign-in': '/(auth)/sign-in',
  family: '/(setup)/family',
  main: '/(main)',
};

/** `true` se o primeiro segmento da rota atual pertence à etapa; senão a guarda redireciona para `STEP_ENTRY_ROUTE`. */
export const isRouteInStep = (step: NextStep, firstSegment: string | undefined): boolean =>
  firstSegment !== undefined && STEP_ROUTE_GROUP[step].includes(firstSegment);
