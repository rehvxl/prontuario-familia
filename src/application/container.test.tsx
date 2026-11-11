import type { AppEnv } from '@/shared/config';
import { renderHook } from '@testing-library/react-native';
import { DEPENDENCY_KEYS, useDependency } from '@/shared/lib';
import { containerDependencies, createContainer } from './container';
import { ContainerProvider, useContainer } from './providers';

const demoEnv: AppEnv = { supabaseUrl: null, supabaseAnonKey: null, googleAuthEnabled: false, backendMode: 'demo' };

describe('createContainer', () => {
  it('modo demo monta os 7 adaptadores locais', async () => {
    const c = createContainer(demoEnv);
    expect(c.mode).toBe('demo');
    for (const key of ['auth', 'families', 'members', 'records', 'storage', 'consents', 'dataExport'] as const) {
      expect(c[key]).toBeDefined();
    }
    // adaptador local de verdade: o OTP de demonstração funciona
    await expect(c.auth.verifyEmailOtp('a@b.com', '000000')).rejects.toMatchObject({ code: 'auth/invalid-code' });
    expect((await c.auth.verifyEmailOtp('a@b.com', '123456')).email).toBe('a@b.com');
  });

  it('cada container tem seu próprio banco local compartilhado entre as portas', async () => {
    const c = createContainer(demoEnv);
    await c.auth.verifyEmailOtp('a@b.com', '123456');
    const family = await c.families.createFamily('Souza');
    expect(await c.families.getMyFamily()).toEqual(family);
  });

  it('overrides trocam só a porta indicada', () => {
    const auth = { marker: true } as never;
    const c = createContainer(demoEnv, { auth });
    expect(c.auth).toBe(auth);
    expect(c.families).toBeDefined();
  });
});

describe('containerDependencies', () => {
  it('registra todas as chaves de DEPENDENCY_KEYS com a porta correspondente', () => {
    const c = createContainer(demoEnv);
    const deps = containerDependencies(c);
    expect(Object.keys(deps).sort()).toEqual(Object.values(DEPENDENCY_KEYS).sort());
    expect(deps[DEPENDENCY_KEYS.auth]).toBe(c.auth);
    expect(deps[DEPENDENCY_KEYS.dataExport]).toBe(c.dataExport);
  });
});

describe('ContainerProvider', () => {
  it('expõe o container e o DI genérico aos hooks', async () => {
    const c = createContainer(demoEnv);
    const { result } = await renderHook(() => ({ container: useContainer(), records: useDependency(DEPENDENCY_KEYS.records) }), {
      wrapper: ({ children }) => <ContainerProvider container={c}>{children}</ContainerProvider>,
    });
    expect(result.current.container).toBe(c);
    expect(result.current.records).toBe(c.records);
  });

  it('useContainer fora do provider falha com mensagem clara', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(renderHook(() => useContainer())).rejects.toThrow(/fora de ContainerProvider/);
    jest.restoreAllMocks();
  });
});
