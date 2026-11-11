// Exclusão definitiva da conta e dos dados do titular (LGPD art. 18, VI).
//
// Fluxo (idempotente; qualquer falha antes da exclusão do usuário pode ser repetida):
//  1. Valida o JWT e identifica o usuário (o id vem do token, nunca do corpo da requisição).
//  2. Descobre as famílias em que ele é o ÚNICO owner.
//  3. Apaga do Storage todos os arquivos dessas famílias (metadados em `attachments` + varredura do prefixo).
//  4. Apaga as famílias (cascata: membros, registros, anexos, memberships) e a auditoria delas.
//  5. Apaga o usuário em auth.users (cascata: profile, consents, memberships em outras famílias).
//
// Única função que usa a service role key (injetada pelo runtime; nunca vai para o app nem para o repositório).
import { authenticate, corsHeaders, createAdminClient, json } from '../_shared/http.ts';

const BUCKET = 'health-files';
const REMOVE_BATCH = 100;

type Admin = ReturnType<typeof createAdminClient>;

async function removeInBatches(admin: Admin, paths: string[]): Promise<void> {
  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    const { error } = await admin.storage.from(BUCKET).remove(paths.slice(i, i + REMOVE_BATCH));
    if (error) throw new Error(`storage.remove: ${error.message}`);
  }
}

/** Lista recursivamente (família/registro/arquivo) para pegar arquivos órfãos que não têm linha em attachments. */
async function listPrefix(admin: Admin, prefix: string, depth = 0): Promise<string[]> {
  const out: string[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await admin.storage.from(BUCKET).list(prefix, { limit: 100, offset });
    if (error) throw new Error(`storage.list: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const entry of data) {
      const full = `${prefix}/${entry.name}`;
      // Pastas vêm sem `id`; arquivos têm `id`.
      if (entry.id === null && depth < 3) out.push(...(await listPrefix(admin, full, depth + 1)));
      else out.push(full);
    }
    if (data.length < 100) break;
    offset += data.length;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const auth = await authenticate(req);
  if (!auth) return json({ error: 'unauthorized' }, 401);
  const { userId } = auth;

  try {
    const admin = createAdminClient();

    // 2. Famílias em que o usuário é owner e não há outro owner.
    const { data: owned, error: ownedError } = await admin
      .from('family_memberships')
      .select('family_id')
      .eq('user_id', userId)
      .eq('role', 'owner');
    if (ownedError) throw new Error(`memberships: ${ownedError.message}`);

    const familyIds: string[] = [];
    for (const { family_id } of owned ?? []) {
      const { count, error } = await admin
        .from('family_memberships')
        .select('user_id', { count: 'exact', head: true })
        .eq('family_id', family_id)
        .eq('role', 'owner')
        .neq('user_id', userId);
      if (error) throw new Error(`owners: ${error.message}`);
      if ((count ?? 0) === 0) familyIds.push(family_id);
    }

    // 3. Arquivos no Storage (antes do banco: se falhar, nada foi apagado e o usuário pode tentar de novo).
    for (const familyId of familyIds) {
      const { data: rows, error } = await admin.from('attachments').select('storage_path').eq('family_id', familyId);
      if (error) throw new Error(`attachments: ${error.message}`);
      const paths = new Set<string>((rows ?? []).map((r: { storage_path: string }) => r.storage_path));
      for (const p of await listPrefix(admin, familyId)) paths.add(p);
      await removeInBatches(admin, [...paths]);
    }

    // 4. Famílias (cascata) e auditoria.
    if (familyIds.length > 0) {
      const { error: famError } = await admin.from('families').delete().in('id', familyIds);
      if (famError) throw new Error(`families.delete: ${famError.message}`);
      const { error: auditError } = await admin.from('audit_events').delete().in('family_id', familyIds);
      if (auditError) throw new Error(`audit.delete: ${auditError.message}`);
    }
    const { error: actorAuditError } = await admin.from('audit_events').delete().eq('actor_id', userId);
    if (actorAuditError) throw new Error(`audit.actor: ${actorAuditError.message}`);

    // 5. Usuário (cascata: profiles, consents, memberships restantes).
    const { error: userError } = await admin.auth.admin.deleteUser(userId);
    if (userError) throw new Error(`auth.deleteUser: ${userError.message}`);

    return json({ deleted: true, families_deleted: familyIds.length });
  } catch (e) {
    // Sem conteúdo de saúde nos logs: só o motivo técnico.
    console.error('delete-account falhou:', e instanceof Error ? e.message : 'erro desconhecido');
    return json({ error: 'delete_failed' }, 500);
  }
});
