import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { env } from '@/shared/config';
import { createSessionStorage } from './secure-store-storage';

let client: SupabaseClient | null = null;

/**
 * Cliente Supabase do app (singleton). Usa SOMENTE a anon key (pública); a segurança está na RLS.
 * A service role key nunca entra no app: ela só existe no runtime das Edge Functions.
 */
export function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error('Supabase não configurado: defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const instance = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      storage: createSessionStorage(),
      storageKey: 'prontuario-auth',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // o callback OAuth é tratado manualmente (exchangeCodeForSession)
      flowType: 'pkce',
    },
  });

  // Em segundo plano o timer de refresh do token é suspenso; ao voltar, retoma (recomendação do Supabase para RN).
  const sync = (state: string) => {
    if (state === 'active') void instance.auth.startAutoRefresh();
    else void instance.auth.stopAutoRefresh();
  };
  sync(AppState.currentState ?? 'active');
  AppState.addEventListener('change', sync);

  client = instance;
  return instance;
}
