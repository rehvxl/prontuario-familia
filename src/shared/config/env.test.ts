import { resolveEnv } from './env';

describe('resolveEnv', () => {
  it('usa demo em dev sem variáveis do Supabase', () => {
    expect(resolveEnv({}, true).backendMode).toBe('demo');
  });
  it('usa supabase quando URL e anon key existem', () => {
    const e = resolveEnv({ EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'k' }, false);
    expect(e.backendMode).toBe('supabase');
  });
  it('falha em produção sem configuração (nunca cai em demo silenciosamente)', () => {
    expect(() => resolveEnv({}, false)).toThrow(/Configuração ausente/);
  });
});
