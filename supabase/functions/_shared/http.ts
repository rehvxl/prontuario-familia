// Utilitários compartilhados das Edge Functions (Deno).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

/** Cliente com o JWT do próprio usuário: a RLS continua valendo (nunca usa a service role). */
export function createUserClient(authHeader: string): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Cliente administrativo (service role). Usar somente onde for indispensável (delete-account). */
export function createAdminClient(): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Valida o JWT do cabeçalho Authorization e devolve o id do usuário (ou null). */
export async function authenticate(req: Request): Promise<{ userId: string; authHeader: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.toLowerCase().startsWith('bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const { data, error } = await createUserClient(authHeader).auth.getUser(token);
  if (error || !data.user) return null;
  return { userId: data.user.id, authHeader };
}
