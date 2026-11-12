// Exportação dos dados do titular (LGPD art. 18, II e V).
// Usa o JWT do próprio usuário (RLS aplicada; sem service role): só exporta o que ele já pode ler.
// Devolve JSON com perfil, famílias, membros, registros, anexos (com URLs assinadas temporárias), consentimentos e,
// desde o format_version 2, medições, doses de vacina, medicamentos e "Não se aplica" (no nível de cima, porque
// itens manuais não têm documento de origem; source_record_id liga ao registro quando há).
// Nenhum dado exportado vai para log: o catch só registra a mensagem técnica.
import { authenticate, corsHeaders, createUserClient, json } from '../_shared/http.ts';

const BUCKET = 'health-files';
const EXPORT_URL_TTL_SECONDS = 3600;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const auth = await authenticate(req);
  if (!auth) return json({ error: 'unauthorized' }, 401);

  try {
    const db = createUserClient(auth.authHeader);

    const [
      profile,
      memberships,
      families,
      members,
      records,
      attachments,
      consents,
      measurements,
      vaccineDoses,
      medications,
      vaccineRuleDismissals,
    ] = await Promise.all([
      db.from('profiles').select('id,email,display_name,created_at').eq('id', auth.userId).maybeSingle(),
      db.from('family_memberships').select('family_id,user_id,role,created_at'),
      db.from('families').select('id,name,created_at,updated_at'),
      db.from('members').select('id,family_id,full_name,birth_date,relationship,sex,created_at,updated_at'),
      db
        .from('health_records')
        .select('id,family_id,member_id,type,title,record_date,location,professional,notes,created_at,updated_at'),
      db.from('attachments').select('id,family_id,record_id,storage_path,file_name,mime_type,size_bytes,created_at'),
      db.from('consents').select('purpose,version,accepted_at,revoked_at'),
      db
        .from('measurements')
        .select(
          'id,family_id,member_id,kind,code,label,value,value2,unit,reference_low,reference_high,reference_text,taken_on,taken_at,context,note,source_record_id,origin,created_at,updated_at',
        ),
      db
        .from('vaccine_doses')
        .select(
          'id,family_id,member_id,vaccine_code,vaccine_name,dose_key,dose_label,applied_on,lot,location,source_record_id,origin,created_at,updated_at',
        ),
      db
        .from('medications')
        .select('id,family_id,member_id,name,dosage,instructions,start_on,end_on,source_record_id,origin,created_at,updated_at'),
      db.from('vaccine_rule_dismissals').select('id,family_id,member_id,rule_id,reason,note,created_at'),
    ]);

    for (const r of [
      profile,
      memberships,
      families,
      members,
      records,
      attachments,
      consents,
      measurements,
      vaccineDoses,
      medications,
      vaccineRuleDismissals,
    ]) {
      if (r.error) throw new Error(r.error.message);
    }

    const attachmentRows = attachments.data ?? [];
    const urlByPath = new Map<string, string | null>();
    if (attachmentRows.length > 0) {
      const { data: signed, error } = await db.storage
        .from(BUCKET)
        .createSignedUrls(attachmentRows.map((a: { storage_path: string }) => a.storage_path), EXPORT_URL_TTL_SECONDS);
      if (error) throw new Error(error.message);
      for (const s of signed ?? []) urlByPath.set(s.path ?? '', s.signedUrl ?? null);
    }

    // Auditoria da própria exportação (RPC security definer; não grava conteúdo).
    await db.rpc('log_data_export');

    const payload = {
      exported_at: new Date().toISOString(),
      format_version: 2,
      note: `As URLs dos anexos expiram em ${EXPORT_URL_TTL_SECONDS / 60} minutos.`,
      profile: profile.data,
      families: families.data ?? [],
      family_memberships: memberships.data ?? [],
      members: members.data ?? [],
      health_records: (records.data ?? []).map((rec: { id: string }) => ({
        ...rec,
        attachments: attachmentRows
          .filter((a: { record_id: string }) => a.record_id === rec.id)
          .map((a: { storage_path: string }) => ({ ...a, download_url: urlByPath.get(a.storage_path) ?? null })),
      })),
      consents: consents.data ?? [],
      // o flag (fora da faixa) não é exportado: é derivado no app; a faixa e o texto da referência são
      measurements: measurements.data ?? [],
      vaccine_doses: vaccineDoses.data ?? [],
      medications: medications.data ?? [],
      vaccine_rule_dismissals: vaccineRuleDismissals.data ?? [],
    };
    return json(payload);
  } catch (e) {
    console.error('export-my-data falhou:', e instanceof Error ? e.message : 'erro desconhecido');
    return json({ error: 'export_failed' }, 500);
  }
});
