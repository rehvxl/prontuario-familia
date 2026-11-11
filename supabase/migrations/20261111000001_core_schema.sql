-- Prontuário da Família — esquema principal.
-- Modelo: auth.users ─1:1─ profiles
--         families ─1:n─ family_memberships ─n:1─ auth.users   (role: owner | editor)
--         families ─1:n─ members ─1:n─ health_records ─1:n─ attachments
--         auth.users ─1:n─ consents
-- A segurança (RLS) é definida em 20261111000002_rls.sql; storage em 20261111000003_storage.sql.

create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Texto normalizado para busca: minúsculas, sem acentos.
create or replace function public.normalize_search_text(p_text text)
returns text
language sql
stable
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, lower(coalesce(p_text, '')));
$$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 com auth.users, criado por trigger)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text check (display_name is null or char_length(display_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- families e family_memberships
-- ---------------------------------------------------------------------------

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger families_set_updated_at
  before update on public.families
  for each row execute function public.set_updated_at();

create table public.family_memberships (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create index family_memberships_user_id_idx on public.family_memberships (user_id);

-- ---------------------------------------------------------------------------
-- members (pessoas da família; não precisam ter conta)
-- ---------------------------------------------------------------------------

create table public.members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 120),
  birth_date date,
  relationship text not null check (relationship in ('self', 'spouse', 'child', 'parent', 'sibling', 'grandparent', 'other')),
  sex text not null default 'unspecified' check (sex in ('female', 'male', 'other', 'unspecified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- permite FK composta de health_records (garante que registro e membro são da mesma família)
  unique (id, family_id)
);

create index members_family_id_idx on public.members (family_id);

create trigger members_set_updated_at
  before update on public.members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- health_records (family_id desnormalizado: RLS e consulta sem join)
-- ---------------------------------------------------------------------------

create table public.health_records (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  member_id uuid not null,
  type text not null check (type in ('consultation', 'exam', 'result', 'report', 'prescription', 'vaccine', 'other')),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  record_date date not null,
  location text check (location is null or char_length(location) <= 200),
  professional text check (professional is null or char_length(professional) <= 200),
  notes text check (notes is null or char_length(notes) <= 10000),
  search tsvector not null default ''::tsvector,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, family_id),
  foreign key (member_id, family_id) references public.members (id, family_id) on delete cascade
);

create index health_records_family_date_idx on public.health_records (family_id, record_date desc, created_at desc);
create index health_records_member_date_idx on public.health_records (member_id, record_date desc, created_at desc);
create index health_records_search_idx on public.health_records using gin (search);

create trigger health_records_set_updated_at
  before update on public.health_records
  for each row execute function public.set_updated_at();

-- tsvector com unaccent + 'portuguese'. unaccent() não é IMMUTABLE, então usamos trigger em vez de coluna gerada.
create or replace function public.health_records_update_search()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search :=
    setweight(to_tsvector('portuguese', public.normalize_search_text(new.title)), 'A') ||
    setweight(to_tsvector('portuguese', public.normalize_search_text(new.professional)), 'B') ||
    setweight(to_tsvector('portuguese', public.normalize_search_text(new.location)), 'B') ||
    setweight(to_tsvector('portuguese', public.normalize_search_text(new.notes)), 'C');
  return new;
end;
$$;

create trigger health_records_update_search
  before insert or update of title, professional, location, notes on public.health_records
  for each row execute function public.health_records_update_search();

-- ---------------------------------------------------------------------------
-- attachments (metadado; o arquivo fica no bucket privado health-files)
-- ---------------------------------------------------------------------------

create table public.attachments (
  id uuid primary key,
  family_id uuid not null,
  record_id uuid not null,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 20971520),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (record_id, family_id) references public.health_records (id, family_id) on delete cascade,
  -- caminho no storage = {family_id}/{record_id}/{attachment_id}.{ext}: a RLS do storage depende disso.
  constraint attachments_storage_path_format check (
    storage_path ~ ('^' || family_id::text || '/' || record_id::text || '/' || id::text || '\.[A-Za-z0-9]{1,8}$')
  )
);

create index attachments_record_id_idx on public.attachments (record_id);
create index attachments_family_id_idx on public.attachments (family_id);

-- ---------------------------------------------------------------------------
-- consents (LGPD art. 11, I) — histórico preservado; um consentimento ativo por finalidade
-- ---------------------------------------------------------------------------

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  purpose text not null check (purpose in ('terms_and_privacy', 'health_data_processing')),
  version text not null check (char_length(version) between 1 and 40),
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (revoked_at is null or revoked_at >= accepted_at)
);

create unique index consents_one_active_per_purpose_idx on public.consents (user_id, purpose) where revoked_at is null;
create index consents_user_id_idx on public.consents (user_id);

-- ---------------------------------------------------------------------------
-- audit_events (auditoria de ações; sem conteúdo de saúde, só ids)
-- ---------------------------------------------------------------------------

create table public.audit_events (
  id bigint generated always as identity primary key,
  family_id uuid,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  created_at timestamptz not null default now()
);

create index audit_events_family_created_idx on public.audit_events (family_id, created_at desc);
create index audit_events_actor_idx on public.audit_events (actor_id);
