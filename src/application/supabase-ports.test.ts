import type { AppEnv } from '@/shared/config';
import { getSupabaseClient } from '@/shared/api';
import { createContainer } from './container';

jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api'),
  getSupabaseClient: jest.fn(),
}));

const supabaseEnv: AppEnv = {
  supabaseUrl: 'https://exemplo.supabase.co',
  supabaseAnonKey: 'chave-publica-de-teste',
  googleAuthEnabled: false,
  backendMode: 'supabase',
};

describe('createContainer em modo supabase', () => {
  it('monta as 7 portas com o cliente único e não toca no banco local', () => {
    const from = jest.fn();
    const client = { from, auth: { onAuthStateChange: jest.fn() }, storage: { from: jest.fn() }, functions: { invoke: jest.fn() } };
    (getSupabaseClient as jest.Mock).mockReturnValue(client);

    const container = createContainer(supabaseEnv);

    expect(container.mode).toBe('supabase');
    expect(getSupabaseClient).toHaveBeenCalledTimes(1);
    for (const key of ['auth', 'families', 'members', 'records', 'storage', 'consents', 'dataExport'] as const) {
      expect(container[key]).toBeDefined();
    }
    expect(from).not.toHaveBeenCalled(); // construir o container não faz consulta
  });

  it('um override substitui a porta sem trocar as demais', () => {
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: jest.fn(), auth: {}, storage: {}, functions: {} });
    const families = { marker: true } as never;
    const container = createContainer(supabaseEnv, { families });
    expect(container.families).toBe(families);
    expect(container.members).toBeDefined();
  });
});
