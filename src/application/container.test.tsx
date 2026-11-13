import type { AppEnv } from '@/shared/config';
import { renderHook } from '@testing-library/react-native';
import { DEPENDENCY_KEYS, useDependency } from '@/shared/lib';
import { createDeviceDocumentTextExtractor, type DocumentTextExtractor } from '@/features/read-document';
import { containerDependencies, createContainer } from './container';
import { ContainerProvider, useContainer } from './providers';

// No Jest o módulo nativo não existe (createDeviceDocumentTextExtractor → null); o teste do nativo simula a presença.
jest.mock('@/features/read-document', () => {
  const actual = jest.requireActual('@/features/read-document');
  return { ...actual, createDeviceDocumentTextExtractor: jest.fn(actual.createDeviceDocumentTextExtractor) };
});

// Sem cliente real: o modo Supabase só interessa aqui pela escolha do leitor.
jest.mock('./supabase-ports', () => ({ createSupabasePorts: () => ({}) }));

const demoEnv: AppEnv = { supabaseUrl: null, supabaseAnonKey: null, googleAuthEnabled: false, backendMode: 'demo' };
const PORTS = ['auth', 'families', 'members', 'records', 'storage', 'consents', 'dataExport', 'measurements', 'vaccineDoses', 'medications', 'emergencyCards', 'documentText'] as const;

describe('createContainer', () => {
  it('modo demo monta as 12 portas locais', async () => {
    const c = createContainer(demoEnv);
    expect(c.mode).toBe('demo');
    for (const key of PORTS) expect(c[key]).toBeDefined();
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

  it('as portas de saúde usam o mesmo banco local (integridade com membros e registros)', async () => {
    const c = createContainer(demoEnv);
    await c.auth.verifyEmailOtp('saude@b.com', '123456');
    const family = await c.families.createFamily('Souza');
    const member = await c.members.create({ familyId: family.id, fullName: 'Lia Souza', birthDate: '2026-01-10', relationship: 'child', sex: 'female' });
    const [dose] = await c.vaccineDoses.createMany([
      { familyId: family.id, memberId: member.id, vaccineCode: 'bcg', vaccineName: null, doseKey: 'DU', doseLabel: 'Dose única', appliedOn: '2026-01-10', lot: null, location: null, sourceRecordId: null, origin: 'manual' },
    ]);
    expect(await c.vaccineDoses.listByMember(member.id)).toEqual([dose]);
    // apagar a pessoa leva a dose (cascata do adaptador local de membros)
    await c.members.remove(member.id);
    expect(await c.vaccineDoses.listByFamily(family.id)).toEqual([]);
  });

  it('overrides trocam só a porta indicada', () => {
    const auth = { marker: true } as never;
    const c = createContainer(demoEnv, { auth });
    expect(c.auth).toBe(auth);
    expect(c.families).toBeDefined();
  });
});

describe('leitor de documentos (ocr-tecnico.md §b.4)', () => {
  const native: DocumentTextExtractor = { availability: 'device', extract: async () => null };

  it('demo sem módulo nativo (Expo Go) → texto simulado', () => {
    expect(createContainer(demoEnv).documentText.availability).toBe('demo');
  });

  it('módulo nativo presente → leitor do aparelho, também no modo demo', () => {
    jest.mocked(createDeviceDocumentTextExtractor).mockReturnValueOnce(native);
    expect(createContainer(demoEnv).documentText).toBe(native);
  });

  it('Supabase sem módulo nativo → leitura indisponível (nunca texto simulado)', () => {
    const supabaseEnv: AppEnv = { ...demoEnv, supabaseUrl: 'http://localhost', supabaseAnonKey: 'anon', backendMode: 'supabase' };
    expect(createContainer(supabaseEnv).documentText.availability).toBe('unavailable');
  });

  it('override troca o leitor (testes de tela com extrator falso)', () => {
    expect(createContainer(demoEnv, { documentText: native }).documentText).toBe(native);
  });
});

describe('containerDependencies', () => {
  it('registra todas as chaves de DEPENDENCY_KEYS com a porta correspondente', () => {
    const c = createContainer(demoEnv);
    const deps = containerDependencies(c);
    expect(Object.keys(deps).sort()).toEqual(Object.values(DEPENDENCY_KEYS).sort());
    expect(deps[DEPENDENCY_KEYS.auth]).toBe(c.auth);
    expect(deps[DEPENDENCY_KEYS.dataExport]).toBe(c.dataExport);
    expect(deps[DEPENDENCY_KEYS.measurements]).toBe(c.measurements);
    expect(deps[DEPENDENCY_KEYS.vaccineDoses]).toBe(c.vaccineDoses);
    expect(deps[DEPENDENCY_KEYS.medications]).toBe(c.medications);
    expect(deps[DEPENDENCY_KEYS.documentText]).toBe(c.documentText);
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
