import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient } from '@tanstack/react-query';
import { CURRENT_TERMS_VERSION } from '@/entities/consent';
import { useSignOut, useVerifyEmailCode } from '@/features/auth';
import { useCreateFamily } from '@/features/create-family';
import { clearLocalFiles } from '@/shared/lib';
import type { AppEnv } from '@/shared/config';
import { createContainer, type AppContainer } from '../container';
import { AppProviders } from '../providers';
import { useDeviceConsentStore } from './device-consent';
import { useConsentFlow } from './use-consent-flow';
import { useSessionState } from './use-session-state';

const env: AppEnv = { supabaseUrl: null, supabaseAnonKey: null, googleAuthEnabled: false, backendMode: 'demo' };

let container: AppContainer;
let queryClient: QueryClient | undefined;

async function setup(existing?: AppContainer) {
  container = existing ?? createContainer(env);
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } });
  return renderHook(
    () => ({
      session: useSessionState(),
      consent: useConsentFlow(),
      verify: useVerifyEmailCode(),
      createFamily: useCreateFamily(),
      signOut: useSignOut(),
    }),
    {
      wrapper: ({ children }) => (
        <AppProviders container={container} queryClient={queryClient}>
          {children}
        </AppProviders>
      ),
    },
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  clearLocalFiles();
  useDeviceConsentStore.setState({ acceptedVersion: null, hydrated: true });
});

afterEach(() => {
  queryClient?.clear();
});

describe('estado de sessão e próximo passo (modo demo, ponta a ponta)', () => {
  it('percorre consentimento → login → família → principal e volta ao login ao sair', async () => {
    const { result } = await setup();

    // 1. instalação nova
    await waitFor(() => expect(result.current.session.status).toBe('ready'));
    expect(result.current.session.nextStep).toBe('consent');

    // 2. aceite no aparelho (ainda sem conta)
    await act(async () => {
      await result.current.consent.mutateAsync({ termsAndPrivacy: true, healthData: true });
    });
    expect(useDeviceConsentStore.getState().acceptedVersion).toBe(CURRENT_TERMS_VERSION);
    await waitFor(() => expect(result.current.session.nextStep).toBe('sign-in'));

    // 3. login: o aceite do aparelho é gravado no repositório e o próximo passo vira "family" sem passar por "consent"
    await act(async () => {
      await result.current.verify.mutateAsync({ email: 'Ana@Exemplo.com', code: '123456' });
    });
    await waitFor(() => expect(result.current.session.nextStep).toBe('family'));
    expect(result.current.session.user?.email).toBe('ana@exemplo.com');
    expect((await container.consents.listMine()).map((c) => c.purpose).sort()).toEqual(['health_data_processing', 'terms_and_privacy']);

    // 4. família
    await act(async () => {
      await result.current.createFamily.mutateAsync('Família Souza');
    });
    await waitFor(() => expect(result.current.session.nextStep).toBe('main'));
    expect(result.current.session.family?.name).toBe('Família Souza');

    // 5. sair: volta ao login (aceite do aparelho continua) e o cache do usuário some
    await act(async () => {
      await result.current.signOut.mutateAsync();
    });
    await waitFor(() => expect(result.current.session.nextStep).toBe('sign-in'));
    expect(result.current.session.user).toBeNull();
    expect(result.current.session.family).toBeNull();
  });

  it('usuário que já tem conta e família entra direto no principal; o aceite do aparelho não é regravado', async () => {
    const first = await setup();
    await act(async () => {
      await first.result.current.consent.mutateAsync({ termsAndPrivacy: true, healthData: true });
      await first.result.current.verify.mutateAsync({ email: 'a@b.com', code: '123456' });
    });
    await waitFor(() => expect(first.result.current.session.nextStep).toBe('family'));
    await act(async () => {
      await first.result.current.createFamily.mutateAsync('Souza');
    });
    await waitFor(() => expect(first.result.current.session.nextStep).toBe('main'));
    await first.unmount();

    // "reabre o app": novo container e cache, mesmo armazenamento local
    const reopened = createContainer(env);
    const acceptSpy = jest.spyOn(reopened.consents, 'accept');
    const second = await setup(reopened);
    await waitFor(() => expect(second.result.current.session.status).toBe('ready'));
    expect(second.result.current.session.nextStep).toBe('main');
    expect(acceptSpy).not.toHaveBeenCalled();
  });

  it('fica em "loading" até o armazenamento do aparelho ser lido', async () => {
    useDeviceConsentStore.setState({ hydrated: false });
    const { result } = await setup();
    expect(result.current.session.status).toBe('loading');
    expect(result.current.session.nextStep).toBeNull();
    await act(async () => {
      useDeviceConsentStore.setState({ hydrated: true });
    });
    await waitFor(() => expect(result.current.session.status).toBe('ready'));
  });

  it('erro ao ler a sessão vira status "error" e retry recupera', async () => {
    container = createContainer(env);
    let fail = true;
    const realGet = container.auth.getCurrentUser;
    container = createContainer(env, {
      auth: {
        ...container.auth,
        getCurrentUser: async () => {
          if (fail) throw new Error('storage quebrado');
          return realGet();
        },
      },
    });
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const { result } = await renderHook(() => useSessionState(), {
      wrapper: ({ children }) => (
        <AppProviders container={container} queryClient={queryClient}>
          {children}
        </AppProviders>
      ),
    });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.nextStep).toBeNull();
    fail = false;
    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.nextStep).toBe('consent');
  });
});

describe('useConsentFlow', () => {
  it('recusa aceite incompleto sem gravar no aparelho', async () => {
    const { result } = await setup();
    await act(async () => {
      await expect(result.current.consent.mutateAsync({ termsAndPrivacy: true, healthData: false })).rejects.toMatchObject({
        code: 'consent/required',
      });
    });
    expect(useDeviceConsentStore.getState().acceptedVersion).toBeNull();
  });

  it('com sessão ativa grava direto no repositório (nova versão dos termos)', async () => {
    const { result } = await setup();
    await waitFor(() => expect(result.current.session.status).toBe('ready'));
    await act(async () => {
      await result.current.verify.mutateAsync({ email: 'a@b.com', code: '123456' });
    });
    await waitFor(() => expect(result.current.session.nextStep).toBe('consent'));
    await act(async () => {
      await result.current.consent.mutateAsync({ termsAndPrivacy: true, healthData: true });
    });
    await waitFor(() => expect(result.current.session.nextStep).toBe('family'));
    expect(useDeviceConsentStore.getState().acceptedVersion).toBeNull();
  });
});
