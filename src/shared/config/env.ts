/**
 * Configuração de ambiente. Só variáveis EXPO_PUBLIC_* (embutidas no bundle, portanto NUNCA segredos).
 * A anon key do Supabase é pública por design: a segurança está na RLS do banco.
 */
export type BackendMode = 'supabase' | 'demo';

export interface AppEnv {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  /** Google OAuth roda pelo Supabase; este flag só esconde o botão até o provedor estar configurado. */
  googleAuthEnabled: boolean;
  backendMode: BackendMode;
}

const read = (v: string | undefined): string | null => (v && v.trim().length > 0 ? v.trim() : null);

export function resolveEnv(
  raw: Record<string, string | undefined>,
  isDev: boolean,
): AppEnv {
  const supabaseUrl = read(raw.EXPO_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = read(raw.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  const forceDemo = raw.EXPO_PUBLIC_DEMO_MODE === '1';
  const hasSupabase = supabaseUrl !== null && supabaseAnonKey !== null;

  if (!hasSupabase && !isDev && !forceDemo) {
    throw new Error('Configuração ausente: defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return {
    supabaseUrl,
    supabaseAnonKey,
    googleAuthEnabled: raw.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED === '1',
    backendMode: hasSupabase && !forceDemo ? 'supabase' : 'demo',
  };
}

// Acesso estático exigido pelo bundler do Expo para inlining de EXPO_PUBLIC_*.
export const env: AppEnv = resolveEnv(
  {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_DEMO_MODE: process.env.EXPO_PUBLIC_DEMO_MODE,
    EXPO_PUBLIC_GOOGLE_AUTH_ENABLED: process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED,
  },
  typeof __DEV__ !== 'undefined' ? __DEV__ : true,
);
