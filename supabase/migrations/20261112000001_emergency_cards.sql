-- Ficha de emergência: 1:1 com members. Mesmo padrão de medications:
-- family_id desnormalizado, FK composta, RLS por is_family_member,
-- grants por coluna, updated_at e auditoria (só ids) por trigger.
-- Identificação e remédios em uso não são colunas: vêm de members e medications.
-- A ficha não tem arquivo no Storage.

-- Forma de cada item das listas (nome obrigatório, tamanhos, chaves do contrato).
-- Sem máscara de telefone. IMMUTABLE: só olha o JSON recebido.
-- Schema private de propósito: não está em [api].schemas, então não vira endpoint.
create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.emergency_card_lists_valid(p_allergies jsonb, p_conditions jsonb, p_contacts jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  item jsonb;
  key text;
begin
  if jsonb_typeof(p_allergies) is distinct from 'array'
     or jsonb_typeof(p_conditions) is distinct from 'array'
     or jsonb_typeof(p_contacts) is distinct from 'array' then
    return false;
  end if;

  for item in select value from jsonb_array_elements(p_allergies)
  loop
    if jsonb_typeof(item) is distinct from 'object'
       or not (item ? 'name')
       or jsonb_typeof(item -> 'name') is distinct from 'string'
       or coalesce(char_length(btrim(item ->> 'name')) not between 1 and 120, true) then
      return false;
    end if;
    if item ? 'reaction' and item -> 'reaction' is distinct from 'null'::jsonb then
      if jsonb_typeof(item -> 'reaction') is distinct from 'string'
         or coalesce(char_length(btrim(item ->> 'reaction')) > 120, true) then
        return false;
      end if;
    end if;
    for key in select jsonb_object_keys(item)
    loop
      if key not in ('name', 'reaction') then
        return false;
      end if;
    end loop;
  end loop;

  for item in select value from jsonb_array_elements(p_conditions)
  loop
    if jsonb_typeof(item) is distinct from 'object'
       or not (item ? 'name')
       or jsonb_typeof(item -> 'name') is distinct from 'string'
       or coalesce(char_length(btrim(item ->> 'name')) not between 1 and 120, true) then
      return false;
    end if;
    for key in select jsonb_object_keys(item)
    loop
      if key <> 'name' then
        return false;
      end if;
    end loop;
  end loop;

  for item in select value from jsonb_array_elements(p_contacts)
  loop
    if jsonb_typeof(item) is distinct from 'object'
       or not (item ? 'name')
       or jsonb_typeof(item -> 'name') is distinct from 'string'
       or coalesce(char_length(btrim(item ->> 'name')) not between 1 and 120, true)
       or not (item ? 'phone')
       or jsonb_typeof(item -> 'phone') is distinct from 'string'
       or coalesce(char_length(btrim(item ->> 'phone')) not between 1 and 30, true) then
      return false;
    end if;
    if item ? 'relation' and item -> 'relation' is distinct from 'null'::jsonb then
      if jsonb_typeof(item -> 'relation') is distinct from 'string'
         or coalesce(char_length(btrim(item ->> 'relation')) > 120, true) then
        return false;
      end if;
    end if;
    for key in select jsonb_object_keys(item)
    loop
      if key not in ('name', 'relation', 'phone') then
        return false;
      end if;
    end loop;
  end loop;

  return true;
end;
$$;

revoke all on function private.emergency_card_lists_valid(jsonb, jsonb, jsonb) from public, anon;
grant execute on function private.emergency_card_lists_valid(jsonb, jsonb, jsonb) to authenticated, service_role;

create table public.emergency_cards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  member_id uuid not null,
  blood_type text not null default 'unknown'
    check (blood_type in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown')),
  no_known_allergies boolean not null default false,
  allergies jsonb not null default '[]'::jsonb,
  conditions jsonb not null default '[]'::jsonb,
  contacts jsonb not null default '[]'::jsonb,
  notes text check (notes is null or char_length(notes) <= 280),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id),
  unique (id, family_id),
  foreign key (member_id, family_id) references public.members (id, family_id) on delete cascade,
  check (jsonb_typeof(allergies) = 'array'),
  check (jsonb_typeof(conditions) = 'array'),
  check (jsonb_typeof(contacts) = 'array'),
  check (jsonb_array_length(allergies) between 0 and 50),
  check (jsonb_array_length(conditions) between 0 and 50),
  check (jsonb_array_length(contacts) between 0 and 3),
  check (not (no_known_allergies and jsonb_array_length(allergies) > 0)),
  constraint emergency_cards_lists_shape check (private.emergency_card_lists_valid(allergies, conditions, contacts))
);

create index emergency_cards_family_idx on public.emergency_cards (family_id);

create trigger emergency_cards_set_updated_at
  before update on public.emergency_cards
  for each row execute function public.set_updated_at();

alter table public.emergency_cards enable row level security;

revoke all on public.emergency_cards from anon, authenticated;
grant select, delete on public.emergency_cards to authenticated;
grant insert (family_id, member_id, blood_type, no_known_allergies, allergies, conditions, contacts, notes)
  on public.emergency_cards to authenticated;
grant update (blood_type, no_known_allergies, allergies, conditions, contacts, notes)
  on public.emergency_cards to authenticated;
-- family_id, member_id, id, created_at, created_by não são atualizáveis pela API.

create policy emergency_cards_select on public.emergency_cards
  for select to authenticated using (public.is_family_member(family_id));
create policy emergency_cards_insert on public.emergency_cards
  for insert to authenticated with check (public.is_family_member(family_id));
create policy emergency_cards_update on public.emergency_cards
  for update to authenticated
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));
create policy emergency_cards_delete on public.emergency_cards
  for delete to authenticated using (public.is_family_member(family_id));

create trigger emergency_cards_audit
  after insert or update or delete on public.emergency_cards
  for each row execute function public.audit_row_change();
