-- pgTAP: políticas do bucket privado health-files (por primeiro segmento do caminho) e busca textual.
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

select plan(33);

-- ===== Setup =====
select tests.create_user('aaaaaaaa-0000-0000-0000-00000000000a', 'a@example.com');
select tests.create_user('bbbbbbbb-0000-0000-0000-00000000000b', 'b@example.com');

select tests.authenticate_as('aaaaaaaa-0000-0000-0000-00000000000a');
insert into tests.ctx select 'famA', id from public.create_family('Família A');
select tests.clear_authentication();
select tests.authenticate_as('bbbbbbbb-0000-0000-0000-00000000000b');
insert into tests.ctx select 'famB', id from public.create_family('Família B');
select tests.clear_authentication();

insert into public.members (id, family_id, full_name, relationship) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', tests.id('famA'), 'Membro A1', 'self'),
  ('aaaaaaaa-0000-0000-0000-0000000000a2', tests.id('famA'), 'Membro A2', 'child'),
  ('bbbbbbbb-0000-0000-0000-0000000000a1', tests.id('famB'), 'Membro B', 'self');
insert into public.health_records (id, family_id, member_id, type, title, record_date, professional, location, notes) values
  ('aaaaaaaa-0000-0000-0000-0000000000b1', tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'exam', 'Hemograma completo', '2026-03-01', null, 'Laboratório Central', null),
  ('aaaaaaaa-0000-0000-0000-0000000000b2', tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'consultation', 'Consulta de rotina', '2026-04-10', 'Dra. Conceição Pereira', 'Clínica São José', 'Pressão normal'),
  ('aaaaaaaa-0000-0000-0000-0000000000b3', tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a2', 'exam', 'Hemograma infantil', '2026-04-10', null, null, null),
  ('bbbbbbbb-0000-0000-0000-0000000000b1', tests.id('famB'), 'bbbbbbbb-0000-0000-0000-0000000000a1', 'exam', 'Hemograma completo B', '2026-03-02', null, null, null);

-- ===== Storage: políticas por primeiro segmento do caminho =====
select tests.authenticate_as('aaaaaaaa-0000-0000-0000-00000000000a');

select lives_ok(
  format($$insert into storage.objects (bucket_id, name) values ('health-files', %L)$$,
         tests.id('famA')::text || '/aaaaaaaa-0000-0000-0000-0000000000b1/aaaaaaaa-0000-0000-0000-0000000000c1.pdf'),
  'A envia arquivo para a própria família'
);
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('health-files', %L)$$,
         tests.id('famB')::text || '/bbbbbbbb-0000-0000-0000-0000000000b1/aaaaaaaa-0000-0000-0000-0000000000c2.pdf'),
  '42501', null, 'A não envia arquivo para o caminho da família B'
);
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('health-files', %L)$$,
         tests.id('famA')::text || '/bbbbbbbb-0000-0000-0000-0000000000b1/aaaaaaaa-0000-0000-0000-0000000000c3.pdf'),
  '42501', null, 'A não envia arquivo para registro que não é da própria família'
);
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('health-files', %L)$$,
         tests.id('famA')::text || '/cccccccc-0000-0000-0000-0000000000b9/aaaaaaaa-0000-0000-0000-0000000000c4.pdf'),
  '42501', null, 'upload exige que o registro exista'
);
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('health-files', %L)$$, tests.id('famA')::text || '/solto.pdf'),
  '42501', null, 'caminho fora do formato {family}/{record}/{attachment}.{ext} é recusado'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('health-files', 'nao-e-uuid/x/y.pdf')$$,
  '42501', null, 'primeiro segmento que não é uuid é recusado (sem erro de cast)'
);

select is((select count(*)::int from storage.objects where bucket_id = 'health-files'), 1, 'A vê apenas os próprios objetos');
select is((select count(*)::int from storage.objects where name like tests.id('famB')::text || '/%'), 0, 'A não lista objetos da família B');
select lives_ok($$select * from storage.objects where name = 'nao-e-uuid/x/y.pdf'$$, 'leitura com caminho inválido não gera erro');
select tests.clear_authentication();

-- objeto de B (inserido como superusuário para o teste de leitura cruzada)
insert into storage.objects (bucket_id, name)
values ('health-files', tests.id('famB')::text || '/bbbbbbbb-0000-0000-0000-0000000000b1/bbbbbbbb-0000-0000-0000-0000000000c1.pdf');

select tests.authenticate_as('bbbbbbbb-0000-0000-0000-00000000000b');
select is((select count(*)::int from storage.objects where bucket_id = 'health-files'), 1, 'B vê apenas o próprio objeto');
select is((select count(*)::int from storage.objects where name like tests.id('famA')::text || '/%'), 0, 'B não lê objetos de A');
with u as (update storage.objects set name = name where name like tests.id('famA')::text || '/%' returning 1) select is((select count(*)::int from u), 0, 'B não altera objetos de A');
-- a Storage API apaga objetos habilitando esta flag; o teste reproduz o mesmo caminho (SQL direto é bloqueado pelo storage.protect_delete)
select set_config('storage.allow_delete_query', 'true', true);
with d as (delete from storage.objects where name like tests.id('famA')::text || '/%' returning 1) select is((select count(*)::int from d), 0, 'B não apaga objetos de A');
select tests.clear_authentication();

select tests.authenticate_as_anon();
select is((select count(*)::int from storage.objects), 0, 'anon não lê nenhum objeto');
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('health-files', %L)$$,
         tests.id('famA')::text || '/aaaaaaaa-0000-0000-0000-0000000000b1/aaaaaaaa-0000-0000-0000-0000000000c5.pdf'),
  '42501', null, 'anon não envia arquivos'
);
select tests.clear_authentication();

select tests.authenticate_as('aaaaaaaa-0000-0000-0000-00000000000a');
select set_config('storage.allow_delete_query', 'true', true);
with d as (delete from storage.objects where bucket_id = 'health-files' returning 1) select is((select count(*)::int from d), 1, 'A apaga o próprio objeto (e só ele)');
select tests.clear_authentication();

-- ===== Busca textual =====
select tests.authenticate_as('aaaaaaaa-0000-0000-0000-00000000000a');

select is((select count(*)::int from public.search_health_records(tests.id('famA'), 'hemogr')), 2, 'prefixo: "hemogr" encontra os 2 hemogramas de A');
select is((select count(*)::int from public.search_health_records(tests.id('famA'), 'HEMOGRAMA')), 2, 'busca ignora maiúsculas');
select is((select count(*)::int from public.search_health_records(tests.id('famA'), 'conceicao')), 1, 'busca ignora acentos (conceicao = Conceição)');
select is((select count(*)::int from public.search_health_records(tests.id('famA'), 'sao jose')), 1, 'vários termos (AND) em local');
select is((select count(*)::int from public.search_health_records(tests.id('famA'), 'pressao')), 1, 'busca em notas');
select is((select count(*)::int from public.search_health_records(tests.id('famA'), 'hemograma completo')), 1, 'AND entre termos');
select is((select count(*)::int from public.search_health_records(tests.id('famA'), 'inexistente')), 0, 'sem resultado');
select is((select count(*)::int from public.search_health_records(tests.id('famA'), '')), 0, 'texto vazio não retorna nada');
select is((select count(*)::int from public.search_health_records(tests.id('famA'), '!&|:*()<>')), 0, 'caracteres especiais de tsquery são neutralizados');
select lives_ok($$select * from public.search_health_records(tests.id('famA'), $q$'; drop table public.members; --$q$)$$, 'texto malicioso não quebra a busca');
select is((select count(*)::int from public.members), 2, 'tabela members intacta (2 membros de A visíveis)');
select is((select count(*)::int from public.search_health_records(tests.id('famB'), 'hemograma')), 0, 'A não encontra registros de B pela busca (RLS)');
select is((select count(*)::int from public.search_health_records(tests.id('famA'), 'hemograma', 'aaaaaaaa-0000-0000-0000-0000000000a2')), 1, 'filtro por membro');
select is((select count(*)::int from public.search_health_records(tests.id('famA'), 'hemograma', null, array['consultation'])), 0, 'filtro por tipo exclui');
select is((select count(*)::int from public.search_health_records(tests.id('famA'), 'hemograma', null, array['exam'])), 2, 'filtro por tipo inclui');
select is(
  (select title from public.search_health_records(tests.id('famA'), 'hemograma') limit 1),
  'Hemograma infantil',
  'ordenado por data desc (mais recente primeiro)'
);
select tests.clear_authentication();

select tests.authenticate_as_anon();
select throws_ok($$select * from public.search_health_records('00000000-0000-0000-0000-000000000000', 'x')$$, '42501', null, 'anon não executa a busca');
select tests.clear_authentication();

select * from finish();
rollback;
