import type { AppEnv } from '@/shared/config';
import { getSupabaseClient } from '@/shared/api';
import { createDeviceDocumentTextExtractor, type DocumentTextExtractor } from '@/features/read-document';
import { createContainer } from './container';

jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api'),
  getSupabaseClient: jest.fn(),
}));
jest.mock('@/features/read-document', () => {
  const actual = jest.requireActual('@/features/read-document');
  return { ...actual, createDeviceDocumentTextExtractor: jest.fn(actual.createDeviceDocumentTextExtractor) };
});

const fakeClient = () => ({ from: jest.fn(), auth: { onAuthStateChange: jest.fn() }, storage: { from: jest.fn() }, functions: { invoke: jest.fn() } });

const supabaseEnv: AppEnv = {
  supabaseUrl: 'https://exemplo.supabase.co',
  supabaseAnonKey: 'chave-publica-de-teste',
  googleAuthEnabled: false,
  backendMode: 'supabase',
};

describe('createContainer em modo supabase', () => {
  it('monta as 11 portas com o cliente único e não toca no banco local', () => {
    const client = fakeClient();
    const { from } = client;
    (getSupabaseClient as jest.Mock).mockReturnValue(client);

    const container = createContainer(supabaseEnv);

    expect(container.mode).toBe('supabase');
    expect(getSupabaseClient).toHaveBeenCalledTimes(1);
    for (const key of ['auth', 'families', 'members', 'records', 'storage', 'consents', 'dataExport', 'measurements', 'vaccineDoses', 'medications', 'documentText'] as const) {
      expect(container[key]).toBeDefined();
    }
    expect(from).not.toHaveBeenCalled(); // construir o container não faz consulta
  });

  it('sem módulo nativo (Expo Go, web) o leitor fica indisponível: nada de texto simulado com dado real', () => {
    (getSupabaseClient as jest.Mock).mockReturnValue(fakeClient());
    expect(createContainer(supabaseEnv).documentText.availability).toBe('unavailable');
  });

  it('com módulo nativo usa o leitor do aparelho', () => {
    (getSupabaseClient as jest.Mock).mockReturnValue(fakeClient());
    const native: DocumentTextExtractor = { availability: 'device', extract: async () => null };
    jest.mocked(createDeviceDocumentTextExtractor).mockReturnValueOnce(native);
    expect(createContainer(supabaseEnv).documentText).toBe(native);
  });

  it('um override substitui a porta sem trocar as demais', () => {
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn(), auth: {}, storage: {}, functions: {} });
    const families = { marker: true } as never;
    const container = createContainer(supabaseEnv, { families });
    expect(container.families).toBe(families);
    expect(container.members).toBeDefined();
  });
});
