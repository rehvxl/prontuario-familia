-- pgTAP: isolamento entre famílias em cada tabela, owner x editor, anônimo, consentimentos e auditoria.
begin;
-- Helpers de teste (existem só dentro da transação do teste; nada disso vai para produção).
create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.create_user(p_id uuid, p_email text) returns void language sql as $$
  insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (p_id, 'authenticated', 'authenticated', p_email, '{}', now(), now());
$$;

create function tests.authenticate_as(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_id::text, true);
  execute 'set local role authenticated';
end $$;

create function tests.authenticate_as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
end $$;

create function tests.clear_authentication() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

-- Guarda ids gerados no setup (famílias criadas por RPC) para os testes consultarem sem depender de RLS.
create table tests.ctx (k text primary key, v uuid not null);
grant select, insert on tests.ctx to anon, authenticated;
create function tests.id(p_key text) returns uuid language sql stable as $$ select v from tests.ctx where k = p_key $$;

select plan(68);

-- ===== Setup (como superusuário) =====
select tests.create_user('aaaaaaaa-0000-0000-0000-00000000000a', 'a@example.com');
select tests.create_user('bbbbbbbb-0000-0000-0000-00000000000b', 'b@example.com');
select tests.create_user('cccccccc-0000-0000-0000-00000000000c', 'c@example.com');

-- A cria a família A (RPC) e B cria a família B
select tests.authenticate_as('aaaaaaaa-0000-0000-0000-00000000000a');
insert into tests.ctx select 'famA', id from public.create_family('Família A');
select tests.clear_authentication();
select tests.authenticate_as('bbbbbbbb-0000-0000-0000-00000000000b');
insert into tests.ctx select 'famB', id from public.create_family('Família B');
select tests.clear_authentication();

-- Dados de A e de B (membros/registros com id fixo inseridos como superusuário; anexos pelo próprio usuário, via RLS)
insert into public.members (id, family_id, full_name, relationship)
values ('aaaaaaaa-0000-0000-0000-0000000000a1', tests.id('famA'), 'Membro A', 'self');
insert into public.health_records (id, family_id, member_id, type, title, record_date)
values ('aaaaaaaa-0000-0000-0000-0000000000b1', tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'exam', 'Exame A', '2026-01-10');
select tests.authenticate_as('aaaaaaaa-0000-0000-0000-00000000000a');
insert into public.attachments (id, family_id, record_id, storage_path, file_name, mime_type, size_bytes)
values ('aaaaaaaa-0000-0000-0000-0000000000c1', tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000b1',
        tests.id('famA')::text || '/aaaaaaaa-0000-0000-0000-0000000000b1/aaaaaaaa-0000-0000-0000-0000000000c1.pdf', 'a.pdf', 'application/pdf', 1000);
select tests.clear_authentication();

insert into public.members (id, family_id, full_name, relationship)
values ('bbbbbbbb-0000-0000-0000-0000000000a1', tests.id('famB'), 'Membro B', 'self');
insert into public.health_records (id, family_id, member_id, type, title, record_date)
values ('bbbbbbbb-0000-0000-0000-0000000000b1', tests.id('famB'), 'bbbbbbbb-0000-0000-0000-0000000000a1', 'exam', 'Exame B', '2026-01-11');
select tests.authenticate_as('bbbbbbbb-0000-0000-0000-00000000000b');
insert into public.attachments (id, family_id, record_id, storage_path, file_name, mime_type, size_bytes)
values ('bbbbbbbb-0000-0000-0000-0000000000c1', tests.id('famB'), 'bbbbbbbb-0000-0000-0000-0000000000b1',
        tests.id('famB')::text || '/bbbbbbbb-0000-0000-0000-0000000000b1/bbbbbbbb-0000-0000-0000-0000000000c1.pdf', 'b.pdf', 'application/pdf', 1000);
select tests.clear_authentication();

-- ===== Owner cria família e vira owner =====
select is(
  (select role from public.family_memberships where family_id = tests.id('famA') and user_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
  'owner', 'create_family torna o criador owner'
);

select tests.authenticate_as('aaaaaaaa-0000-0000-0000-00000000000a');

select throws_ok($$select public.create_family('Outra família A')$$, 'P0001', 'family_already_exists', 'MVP: segunda família própria é recusada');
select throws_ok($$select public.create_family('x')$$, '22023', null, 'nome curto é recusado');

-- ===== A não lê nada da família de B (cada tabela) =====
select is((select count(*)::int from public.families), 1, 'A vê só 1 família');
select is((select count(*)::int from public.families where id = tests.id('famB')), 0, 'A não lê a família de B');
select is((select count(*)::int from public.family_memberships where family_id = tests.id('famB')), 0, 'A não lê memberships de B');
select is((select count(*)::int from public.members where family_id = tests.id('famB')), 0, 'A não lê membros de B');
select is((select count(*)::int from public.health_records where family_id = tests.id('famB')), 0, 'A não lê registros de B');
select is((select count(*)::int from public.attachments where family_id = tests.id('famB')), 0, 'A não lê anexos de B');
select is((select count(*)::int from public.profiles where id = 'bbbbbbbb-0000-0000-0000-00000000000b'), 0, 'A não lê o perfil de B');
select is((select count(*)::int from public.profiles), 1, 'A vê só o próprio perfil');
select is((select count(*)::int from public.audit_events where family_id = tests.id('famB')), 0, 'A não lê auditoria de B');

-- ===== A não escreve na família de B =====
select throws_ok(
  format($$insert into public.members (family_id, full_name, relationship) values (%L, 'Intruso', 'other')$$, tests.id('famB')),
  '42501', null, 'A não cria membro na família de B'
);
select throws_ok(
  format($$insert into public.health_records (family_id, member_id, type, title, record_date) values (%L, 'bbbbbbbb-0000-0000-0000-0000000000a1', 'exam', 'Intruso', current_date)$$, tests.id('famB')),
  '42501', null, 'A não cria registro na família de B'
);
select throws_ok(
  format($$insert into public.health_records (family_id, member_id, type, title, record_date) values (%L, 'bbbbbbbb-0000-0000-0000-0000000000a1', 'exam', 'Intruso', current_date)$$, tests.id('famA')),
  '23503', null, 'A não cria registro na própria família apontando para membro de B'
);
select throws_ok(
  format($$insert into public.attachments (id, family_id, record_id, storage_path, file_name, mime_type, size_bytes) values ('aaaaaaaa-0000-0000-0000-0000000000c9', %L, 'bbbbbbbb-0000-0000-0000-0000000000b1', %L, 'x.pdf', 'application/pdf', 10)$$,
         tests.id('famB'), tests.id('famB')::text || '/bbbbbbbb-0000-0000-0000-0000000000b1/aaaaaaaa-0000-0000-0000-0000000000c9.pdf'),
  '42501', null, 'A não cria anexo em registro de B'
);

with u as (update public.families set name = 'Invadida' where id = tests.id('famB') returning 1) select is((select count(*)::int from u), 0, 'A não renomeia a família de B');
with u as (update public.members set full_name = 'Invadido' where family_id = tests.id('famB') returning 1) select is((select count(*)::int from u), 0, 'A não altera membro de B');
with u as (update public.health_records set title = 'Invadido' where family_id = tests.id('famB') returning 1) select is((select count(*)::int from u), 0, 'A não altera registro de B');
with u as (update public.profiles set display_name = 'Invadido' where id = 'bbbbbbbb-0000-0000-0000-00000000000b' returning 1) select is((select count(*)::int from u), 0, 'A não altera o perfil de B');
with d as (delete from public.members where family_id = tests.id('famB') returning 1) select is((select count(*)::int from d), 0, 'A não apaga membro de B');
with d as (delete from public.health_records where family_id = tests.id('famB') returning 1) select is((select count(*)::int from d), 0, 'A não apaga registro de B');
with d as (delete from public.attachments where family_id = tests.id('famB') returning 1) select is((select count(*)::int from d), 0, 'A não apaga anexo de B');

-- ===== Membro vê e edita os próprios registros =====
select lives_ok(
  format($$insert into public.members (family_id, full_name, birth_date, relationship, sex) values (%L, 'Filha A', '2018-05-01', 'child', 'female')$$, tests.id('famA')),
  'A cria membro na própria família'
);
select lives_ok(
  format($$insert into public.health_records (family_id, member_id, type, title, record_date, notes) values (%L, 'aaaaaaaa-0000-0000-0000-0000000000a1', 'consultation', 'Consulta A', '2026-02-01', 'ok')$$, tests.id('famA')),
  'A cria registro na própria família'
);

select is((select count(*)::int from public.health_records where family_id = tests.id('famA')), 2, 'A vê os próprios registros');
select is((select title from public.health_records where id = 'aaaaaaaa-0000-0000-0000-0000000000b1'), 'Exame A', 'conteúdo do registro correto');
select lives_ok($$update public.health_records set title = 'Exame A (editado)' where id = 'aaaaaaaa-0000-0000-0000-0000000000b1'$$, 'A edita o próprio registro');
with u as (update public.families set name = 'Família A Renomeada' where id = tests.id('famA') returning 1) select is((select count(*)::int from u), 1, 'owner renomeia a própria família');

-- escrita direta proibida em tabelas gerenciadas por RPC
select throws_ok($$insert into public.families (name) values ('Direta')$$, '42501', null, 'insert direto em families é proibido');
select throws_ok(format($$insert into public.family_memberships (family_id, user_id, role) values (%L, 'aaaaaaaa-0000-0000-0000-00000000000a', 'owner')$$, tests.id('famB')),
  '42501', null, 'A não se adiciona à família de B');
select throws_ok($$insert into public.consents (user_id, purpose, version) values ('aaaaaaaa-0000-0000-0000-00000000000a', 'terms_and_privacy', 'v1')$$,
  '42501', null, 'insert direto em consents é proibido (só RPC)');
select throws_ok($$insert into public.audit_events (action, entity) values ('FAKE', 'x')$$, '42501', null, 'usuário não escreve auditoria');
select throws_ok($$update public.members set family_id = '00000000-0000-0000-0000-000000000000' where id = 'aaaaaaaa-0000-0000-0000-0000000000a1'$$,
  '42501', null, 'não é possível mover membro de família (update de family_id negado)');

-- ===== Consentimentos (LGPD): histórico preservado =====
select is((select (public.accept_consent('terms_and_privacy', '2026-11-v1')).version), '2026-11-v1', 'accept_consent registra o aceite');
select is((select count(*)::int from public.consents where purpose = 'terms_and_privacy' and revoked_at is null), 1, 'um consentimento ativo');
select lives_ok($$select public.accept_consent('terms_and_privacy', '2026-11-v1')$$, 'aceitar a mesma versão de novo é idempotente');
select is((select count(*)::int from public.consents where purpose = 'terms_and_privacy'), 1, 'sem linha duplicada');
select lives_ok($$select public.accept_consent('terms_and_privacy', '2026-12-v2')$$, 'nova versão substitui a anterior');
select is((select count(*)::int from public.consents where purpose = 'terms_and_privacy'), 2, 'histórico preservado (2 linhas)');
select is((select count(*)::int from public.consents where purpose = 'terms_and_privacy' and revoked_at is null), 1, 'só a nova versão fica ativa');
select lives_ok($$select public.revoke_consent('terms_and_privacy')$$, 'revogar consentimento');
select is((select count(*)::int from public.consents where purpose = 'terms_and_privacy' and revoked_at is null), 0, 'nenhum consentimento ativo após revogar');
select throws_ok($$select public.accept_consent('marketing', 'v1')$$, '23514', null, 'finalidade inválida é recusada');

-- ===== Auditoria: owner vê os eventos da própria família =====
select ok((select count(*) from public.audit_events where family_id = tests.id('famA')) >= 4, 'owner lê a auditoria da própria família (criação, membro, registro, anexo)');
select ok(not exists (select 1 from public.audit_events e where e.family_id = tests.id('famA') and to_jsonb(e)::text like '%Exame A%'), 'auditoria não guarda conteúdo de saúde');

select tests.clear_authentication();

-- ===== B também não vê A =====
select tests.authenticate_as('bbbbbbbb-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.health_records where family_id = tests.id('famA')), 0, 'B não lê registros de A');
select is((select count(*)::int from public.consents), 0, 'B não lê consentimentos de A');
select is((select count(*)::int from public.health_records), 1, 'B vê só o próprio registro');
select tests.clear_authentication();

-- ===== Editor (C) de uma família enxerga seus registros, mas não renomeia nem vê outras famílias =====
insert into public.family_memberships (family_id, user_id, role) values (tests.id('famA'), 'cccccccc-0000-0000-0000-00000000000c', 'editor');
select tests.authenticate_as('cccccccc-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.health_records where family_id = tests.id('famA')), 2, 'membro (editor) vê registros da família');
select is((select count(*)::int from public.health_records where family_id = tests.id('famB')), 0, 'editor de A não vê registros de B');
select lives_ok(
  format($$insert into public.health_records (family_id, member_id, type, title, record_date) values (%L, 'aaaaaaaa-0000-0000-0000-0000000000a1', 'consultation', 'Consulta do editor', current_date)$$, tests.id('famA')),
  'editor cria registro na família'
);
with u as (update public.families set name = 'Editor renomeou' where id = tests.id('famA') returning 1) select is((select count(*)::int from u), 0, 'editor não renomeia a família (só owner)');
select is((select count(*)::int from public.audit_events), 0, 'editor não lê auditoria (só owner)');
select tests.clear_authentication();

-- ===== Anônimo não lê nada =====
select tests.authenticate_as_anon();
select throws_ok($$select * from public.families$$, '42501', null, 'anon não lê families');
select throws_ok($$select * from public.family_memberships$$, '42501', null, 'anon não lê family_memberships');
select throws_ok($$select * from public.members$$, '42501', null, 'anon não lê members');
select throws_ok($$select * from public.health_records$$, '42501', null, 'anon não lê health_records');
select throws_ok($$select * from public.attachments$$, '42501', null, 'anon não lê attachments');
select throws_ok($$select * from public.consents$$, '42501', null, 'anon não lê consents');
select throws_ok($$select * from public.profiles$$, '42501', null, 'anon não lê profiles');
select throws_ok($$select * from public.audit_events$$, '42501', null, 'anon não lê audit_events');
select throws_ok($$select public.create_family('Anônima')$$, '42501', null, 'anon não executa create_family');
select throws_ok($$select public.is_family_member('00000000-0000-0000-0000-000000000000')$$, '42501', null, 'anon não executa is_family_member');
select tests.clear_authentication();

-- ===== Restrições de integridade =====
select throws_ok(
  format($$insert into public.attachments (id, family_id, record_id, storage_path, file_name, mime_type, size_bytes) values ('aaaaaaaa-0000-0000-0000-0000000000c8', %L, 'aaaaaaaa-0000-0000-0000-0000000000b1', 'qualquer/caminho.pdf', 'x.pdf', 'application/pdf', 10)$$, tests.id('famA')),
  '23514', null, 'storage_path fora do formato {family}/{record}/{id}.{ext} é rejeitado'
);
select throws_ok(
  format($$insert into public.attachments (id, family_id, record_id, storage_path, file_name, mime_type, size_bytes) values ('aaaaaaaa-0000-0000-0000-0000000000c7', %L, 'aaaaaaaa-0000-0000-0000-0000000000b1', %L, 'x.exe', 'application/x-msdownload', 10)$$,
         tests.id('famA'), tests.id('famA')::text || '/aaaaaaaa-0000-0000-0000-0000000000b1/aaaaaaaa-0000-0000-0000-0000000000c7.exe'),
  '23514', null, 'tipo de arquivo não permitido é rejeitado'
);

-- Excluir o membro apaga registros e anexos (cascata)
delete from public.members where id = 'aaaaaaaa-0000-0000-0000-0000000000a1';
select is((select count(*)::int from public.health_records where family_id = tests.id('famA')), 0, 'excluir membro apaga os registros');
select is((select count(*)::int from public.attachments where family_id = tests.id('famA')), 0, 'excluir membro apaga os anexos');

select * from finish();
rollback;
