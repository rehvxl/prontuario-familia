-- pgTAP: estrutura, RLS habilitada em todas as tabelas, bucket privado e triggers.
begin;
select plan(17);

-- RLS em todas as tabelas do schema public, sem exceção
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0,
  'toda tabela em public tem RLS habilitada'
);

select is(
  (select array_agg(tablename::text order by tablename) from pg_tables where schemaname = 'public'),
  array['attachments', 'audit_events', 'consents', 'emergency_cards', 'families', 'family_memberships', 'health_records', 'measurements',
        'medications', 'members', 'profiles', 'vaccine_doses', 'vaccine_rule_dismissals'],
  'conjunto esperado de tabelas'
);

-- anon não tem nenhum privilégio de tabela em public
select is(
  (select count(*)::int from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'),
  0,
  'anon não tem grants em tabelas de public'
);

-- toda tabela de public tem ao menos uma política (nenhuma depende só do "deny all" implícito sem intenção documentada)
select is(
  (select count(*)::int
     from pg_tables t
    where t.schemaname = 'public'
      and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename)),
  0,
  'toda tabela tem pelo menos uma política'
);

-- bucket privado
select is((select public from storage.buckets where id = 'health-files'), false, 'bucket health-files é privado');
select is((select file_size_limit from storage.buckets where id = 'health-files'), 20971520::bigint, 'limite de 20 MB');
select is(
  (select allowed_mime_types from storage.buckets where id = 'health-files'),
  array['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'],
  'mimes permitidos'
);

-- funções de autorização: security definer com search_path fixo
select is(
  (select count(*)::int
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('is_family_member', 'is_family_owner', 'create_family', 'accept_consent', 'revoke_consent', 'handle_new_user')
      and p.prosecdef
      and p.proconfig::text like '%search_path=%'),
  6,
  'funções security definer têm search_path fixo'
);

select has_index('public', 'health_records', 'health_records_search_idx', 'índice GIN de busca existe');
select is(
  (select am.amname::text from pg_index i
     join pg_class c on c.oid = i.indexrelid
     join pg_am am on am.oid = c.relam
    where c.relname = 'health_records_search_idx'),
  'gin',
  'índice de busca é GIN'
);

-- trigger de criação de perfil
insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'perfil@example.com',
        '{"full_name": "  Maria Teste  "}', now(), now());
select is((select email from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'perfil@example.com', 'trigger cria o perfil com e-mail');
select is((select display_name from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'Maria Teste', 'nome vem de user_metadata, sem espaços sobrando');

-- restrições de domínio
select throws_ok(
  $$insert into public.families (name) values ('A')$$,
  '23514', null, 'nome de família com 1 caractere é rejeitado'
);
select lives_ok(
  $$insert into public.families (id, name) values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'Família Silva')$$,
  'nome válido é aceito'
);
select throws_ok(
  $$insert into public.members (family_id, full_name, relationship) values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'X', 'cousin')$$,
  '23514', null, 'parentesco inválido é rejeitado'
);

-- registro não pode apontar para membro de outra família (FK composta)
insert into public.families (id, name) values ('aaaaaaaa-0000-0000-0000-0000000000f2', 'Outra Família');
insert into public.members (id, family_id, full_name, relationship)
values ('aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-0000000000f1', 'João', 'self');
select throws_ok(
  $$insert into public.health_records (family_id, member_id, type, title, record_date)
    values ('aaaaaaaa-0000-0000-0000-0000000000f2', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'exam', 'Hemograma', current_date)$$,
  '23503', null, 'registro com family_id diferente da do membro é rejeitado'
);

-- tsvector preenchido por trigger, sem acento
insert into public.health_records (id, family_id, member_id, type, title, record_date, notes)
values ('aaaaaaaa-0000-0000-0000-0000000000b1', 'aaaaaaaa-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-0000000000a1',
        'consultation', 'Consulta cardiológica', current_date, 'Pressão controlada');
select ok(
  (select search @@ to_tsquery('portuguese', 'cardiologica') from public.health_records where id = 'aaaaaaaa-0000-0000-0000-0000000000b1'),
  'busca ignora acentos (cardiológica = cardiologica)'
);

select * from finish();
rollback;
