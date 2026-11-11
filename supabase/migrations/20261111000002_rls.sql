-- Prontuário da Família — Row Level Security, grants, funções e RPCs.
-- Regra base: o usuário só enxerga/altera linhas de famílias em que tem family_memberships.
-- RLS habilitada em TODAS as tabelas do schema public. anon não tem acesso a nada.

alter table public.health_records alter column created_by set default auth.uid();
alter table public.attachments alter column created_by set default auth.uid();
alter table public.families alter column created_by set default auth.uid();

-- ---------------------------------------------------------------------------
-- Funções de autorização (security definer + search_path fixo: evitam recursão de RLS)
-- ---------------------------------------------------------------------------

create or replace function public.is_family_member(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_memberships m
    where m.family_id = p_family_id
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_family_owner(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_memberships m
    where m.family_id = p_family_id
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
  );
$$;

revoke all on function public.is_family_member(uuid) from public, anon;
revoke all on function public.is_family_owner(uuid) from public, anon;
grant execute on function public.is_family_member(uuid) to authenticated, service_role;
grant execute on function public.is_family_owner(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Habilita RLS em todas as tabelas (sem exceção) e remove os grants padrão
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_memberships enable row level security;
alter table public.members enable row level security;
alter table public.health_records enable row level security;
alter table public.attachments enable row level security;
alter table public.consents enable row level security;
alter table public.audit_events enable row level security;

revoke all on public.profiles, public.families, public.family_memberships, public.members,
  public.health_records, public.attachments, public.consents, public.audit_events
  from anon, authenticated;
revoke all on sequence public.audit_events_id_seq from anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles: só o próprio usuário (linha criada por trigger; sem insert/delete via API)
-- ---------------------------------------------------------------------------

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- families: leitura por membros; renomear só owner; criação só via create_family()
-- ---------------------------------------------------------------------------

grant select on public.families to authenticated;
grant update (name) on public.families to authenticated;

create policy families_select_member on public.families
  for select to authenticated
  using (public.is_family_member(id));

create policy families_update_owner on public.families
  for update to authenticated
  using (public.is_family_owner(id))
  with check (public.is_family_owner(id));

-- ---------------------------------------------------------------------------
-- family_memberships: cada um vê a própria e a dos colegas da família; escrita só por RPC/serviço
-- ---------------------------------------------------------------------------

grant select on public.family_memberships to authenticated;

create policy memberships_select_same_family on public.family_memberships
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_family_member(family_id));

-- ---------------------------------------------------------------------------
-- members
-- ---------------------------------------------------------------------------

grant select, delete on public.members to authenticated;
grant insert (family_id, full_name, birth_date, relationship, sex) on public.members to authenticated;
grant update (full_name, birth_date, relationship, sex) on public.members to authenticated;

create policy members_select on public.members
  for select to authenticated using (public.is_family_member(family_id));
create policy members_insert on public.members
  for insert to authenticated with check (public.is_family_member(family_id));
create policy members_update on public.members
  for update to authenticated
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));
create policy members_delete on public.members
  for delete to authenticated using (public.is_family_member(family_id));

-- ---------------------------------------------------------------------------
-- health_records (a FK composta (member_id, family_id) impede registro de uma família em membro de outra)
-- ---------------------------------------------------------------------------

grant select, delete on public.health_records to authenticated;
grant insert (family_id, member_id, type, title, record_date, location, professional, notes)
  on public.health_records to authenticated;
grant update (type, title, record_date, location, professional, notes) on public.health_records to authenticated;

create policy health_records_select on public.health_records
  for select to authenticated using (public.is_family_member(family_id));
create policy health_records_insert on public.health_records
  for insert to authenticated with check (public.is_family_member(family_id));
create policy health_records_update on public.health_records
  for update to authenticated
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));
create policy health_records_delete on public.health_records
  for delete to authenticated using (public.is_family_member(family_id));

-- ---------------------------------------------------------------------------
-- attachments
-- ---------------------------------------------------------------------------

grant select, delete on public.attachments to authenticated;
grant insert (id, family_id, record_id, storage_path, file_name, mime_type, size_bytes)
  on public.attachments to authenticated;

create policy attachments_select on public.attachments
  for select to authenticated using (public.is_family_member(family_id));
create policy attachments_insert on public.attachments
  for insert to authenticated with check (public.is_family_member(family_id));
create policy attachments_delete on public.attachments
  for delete to authenticated using (public.is_family_member(family_id));

-- ---------------------------------------------------------------------------
-- consents: leitura do próprio histórico; aceite/revogação só pelas RPCs abaixo
-- ---------------------------------------------------------------------------

grant select on public.consents to authenticated;

create policy consents_select_own on public.consents
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- audit_events: só owners da família leem; escrita só por triggers/RPCs security definer
-- ---------------------------------------------------------------------------

grant select on public.audit_events to authenticated;

create policy audit_events_select_owner on public.audit_events
  for select to authenticated
  using (family_id is not null and public.is_family_owner(family_id));

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.audit_events (family_id, actor_id, action, entity, entity_id)
  values ((v ->> 'family_id')::uuid, auth.uid(), tg_op, tg_table_name, (v ->> 'id')::uuid);
  return null;
end;
$$;

revoke all on function public.audit_row_change() from public, anon, authenticated;

create trigger members_audit
  after insert or update or delete on public.members
  for each row execute function public.audit_row_change();
create trigger health_records_audit
  after insert or update or delete on public.health_records
  for each row execute function public.audit_row_change();
create trigger attachments_audit
  after insert or delete on public.attachments
  for each row execute function public.audit_row_change();

-- ---------------------------------------------------------------------------
-- RPC: criar família (usuário vira owner). MVP: uma família própria por conta.
-- ---------------------------------------------------------------------------

create or replace function public.create_family(p_name text)
returns public.families
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_family public.families;
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado' using errcode = '28000';
  end if;
  if char_length(v_name) not between 2 and 60 then
    raise exception 'O nome da família deve ter entre 2 e 60 caracteres' using errcode = '22023';
  end if;
  if exists (select 1 from public.family_memberships where user_id = v_uid and role = 'owner') then
    raise exception 'family_already_exists' using errcode = 'P0001', hint = 'MVP: uma família própria por conta.';
  end if;

  insert into public.families (name, created_by) values (v_name, v_uid) returning * into v_family;
  insert into public.family_memberships (family_id, user_id, role) values (v_family.id, v_uid, 'owner');
  insert into public.audit_events (family_id, actor_id, action, entity, entity_id)
  values (v_family.id, v_uid, 'INSERT', 'families', v_family.id);

  return v_family;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs de consentimento (histórico preservado; um consentimento ativo por finalidade)
-- ---------------------------------------------------------------------------

create or replace function public.accept_consent(p_purpose text, p_version text)
returns public.consents
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.consents;
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado' using errcode = '28000';
  end if;

  select * into v_row
  from public.consents
  where user_id = v_uid and purpose = p_purpose and revoked_at is null;

  if found and v_row.version = p_version then
    return v_row;
  end if;

  -- versão anterior ativa é encerrada (substituída) e a nova é registrada
  update public.consents
  set revoked_at = now()
  where user_id = v_uid and purpose = p_purpose and revoked_at is null;

  insert into public.consents (user_id, purpose, version)
  values (v_uid, p_purpose, p_version)
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.revoke_consent(p_purpose text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado' using errcode = '28000';
  end if;
  update public.consents
  set revoked_at = now()
  where user_id = v_uid and purpose = p_purpose and revoked_at is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: registra no audit_events que o titular exportou os próprios dados (chamada pela Edge Function)
-- ---------------------------------------------------------------------------

create or replace function public.log_data_export()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado' using errcode = '28000';
  end if;
  insert into public.audit_events (family_id, actor_id, action, entity, entity_id)
  select m.family_id, v_uid, 'EXPORT', 'account', v_uid
  from public.family_memberships m
  where m.user_id = v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Busca textual (security invoker: a RLS de health_records continua valendo).
-- Tokens viram prefixos ("hemogr" encontra "hemograma"); acentos são ignorados.
-- ---------------------------------------------------------------------------

create or replace function public.search_health_records(
  p_family_id uuid,
  p_text text,
  p_member_id uuid default null,
  p_types text[] default null
)
returns setof public.health_records
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_tokens text[];
  v_query tsquery;
begin
  select coalesce(array_agg(t || ':*'), '{}')
  into v_tokens
  from unnest(regexp_split_to_array(btrim(regexp_replace(public.normalize_search_text(p_text), '[^a-z0-9]+', ' ', 'g')), '\s+')) as t
  where t <> '';

  if cardinality(v_tokens) = 0 then
    return;
  end if;
  v_query := to_tsquery('portuguese', array_to_string(v_tokens, ' & '));

  return query
    select r.*
    from public.health_records r
    where r.family_id = p_family_id
      and (p_member_id is null or r.member_id = p_member_id)
      and (p_types is null or r.type = any (p_types))
      and r.search @@ v_query
    order by r.record_date desc, r.created_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissões de execução: só usuários autenticados (e o serviço) chamam as RPCs
-- ---------------------------------------------------------------------------

revoke all on function public.create_family(text) from public, anon;
revoke all on function public.accept_consent(text, text) from public, anon;
revoke all on function public.revoke_consent(text) from public, anon;
revoke all on function public.log_data_export() from public, anon;
revoke all on function public.search_health_records(uuid, text, uuid, text[]) from public, anon;
revoke all on function public.normalize_search_text(text) from public, anon;

grant execute on function public.create_family(text) to authenticated;
grant execute on function public.accept_consent(text, text) to authenticated;
grant execute on function public.revoke_consent(text) to authenticated;
grant execute on function public.log_data_export() to authenticated;
grant execute on function public.search_health_records(uuid, text, uuid, text[]) to authenticated;
grant execute on function public.normalize_search_text(text) to authenticated, service_role;

-- Funções de trigger não devem ser chamáveis pela API
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.health_records_update_search() from public, anon, authenticated;
