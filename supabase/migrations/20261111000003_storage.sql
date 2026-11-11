-- Prontuário da Família — Storage privado.
-- Bucket `health-files` (privado, 20 MB, PDF/JPEG/PNG/HEIC/HEIF/WEBP). Caminho: {family_id}/{record_id}/{attachment_id}.{ext}
-- As políticas de storage.objects checam o PRIMEIRO segmento do caminho contra as famílias do usuário.
-- Leitura somente por URL assinada de curta duração (createSignedUrl; padrão do app: 300 s).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'health-files',
  'health-files',
  false,
  20971520,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Converte o 1º segmento do caminho em uuid (null se o formato não for um uuid: nunca lança erro).
create or replace function public.storage_path_family_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(p_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(p_name, '/', 1)::uuid
  end;
$$;

-- O upload só é aceito no formato {family}/{record}/{attachment}.{ext} e se o registro existir nessa família.
create or replace function public.storage_path_is_valid_upload(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,8}$'
    and exists (
      select 1
      from public.health_records r
      where r.id = split_part(p_name, '/', 2)::uuid
        and r.family_id = split_part(p_name, '/', 1)::uuid
    );
$$;

revoke all on function public.storage_path_family_id(text) from public, anon;
revoke all on function public.storage_path_is_valid_upload(text) from public, anon;
grant execute on function public.storage_path_family_id(text) to authenticated, service_role;
grant execute on function public.storage_path_is_valid_upload(text) to authenticated, service_role;

create policy health_files_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'health-files'
    and public.is_family_member(public.storage_path_family_id(name))
  );

create policy health_files_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'health-files'
    and public.is_family_member(public.storage_path_family_id(name))
    and public.storage_path_is_valid_upload(name)
  );

create policy health_files_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'health-files'
    and public.is_family_member(public.storage_path_family_id(name))
  )
  with check (
    bucket_id = 'health-files'
    and public.is_family_member(public.storage_path_family_id(name))
    and public.storage_path_is_valid_upload(name)
  );

create policy health_files_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'health-files'
    and public.is_family_member(public.storage_path_family_id(name))
  );
