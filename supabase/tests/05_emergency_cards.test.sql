-- pgTAP: ficha de emergência — esquema, CHECKs, RLS entre famílias, cascata e auditoria só com ids.
-- Também a passagem do termo 2026-11-v2 → 2026-11-v3 pela RPC accept_consent (sem migração nova).
begin;
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
create table tests.ctx (k text primary key, v uuid not null);
grant select, insert on tests.ctx to anon, authenticated;
create function tests.id(p_key text) returns uuid language sql stable as $$ select v from tests.ctx where k = p_key $$;

select plan(70);

-- ===== Schema
select is(
  (select array_agg(a.attname || ' ' || pg_catalog.format_type(a.atttypid, a.atttypmod) order by a.attnum)
     from pg_attribute a
    where a.attrelid = 'public.emergency_cards'::regclass and a.attnum > 0 and not a.attisdropped),
  array[
    'id uuid', 'family_id uuid', 'member_id uuid', 'blood_type text', 'no_known_allergies boolean',
    'allergies jsonb', 'conditions jsonb', 'contacts jsonb', 'notes text', 'created_by uuid',
    'created_at timestamp with time zone', 'updated_at timestamp with time zone'
  ],
  'colunas e tipos do contrato'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.emergency_cards'::regclass),
  true,
  'RLS habilitada em emergency_cards'
);
select has_index('public', 'emergency_cards', 'emergency_cards_family_idx', 'índice por family_id');
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.emergency_cards'::regclass and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (member_id)'
  ),
  'unique (member_id): uma ficha por membro'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.emergency_cards'::regclass and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (id, family_id)'
  ),
  'unique (id, family_id)'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.emergency_cards'::regclass and contype = 'f'
      and confrelid = 'public.members'::regclass and confdeltype = 'c'
      and pg_get_constraintdef(oid) like '%FOREIGN KEY (member_id, family_id)%'
  ),
  'FK composta para members com on delete cascade'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgname = 'emergency_cards_set_updated_at' and tgrelid = 'public.emergency_cards'::regclass and not tgisinternal
  ),
  'trigger de updated_at'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgname = 'emergency_cards_audit' and tgrelid = 'public.emergency_cards'::regclass and not tgisinternal
  ),
  'trigger de auditoria'
);
select policies_are(
  'public', 'emergency_cards',
  array['emergency_cards_delete', 'emergency_cards_insert', 'emergency_cards_select', 'emergency_cards_update'],
  'políticas de select, insert, update e delete'
);
select ok(
  (select bool_and(
      coalesce(qual, '') like '%is_family_member%'
      or coalesce(with_check, '') like '%is_family_member%'
    )
     from pg_policies where schemaname = 'public' and tablename = 'emergency_cards'),
  'políticas usam is_family_member'
);
select is(
  (select count(*)::int from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public' and table_name = 'emergency_cards'),
  0,
  'anon não tem grant na ficha'
);
select is(
  (select array_agg(column_name::text order by column_name)
     from (
       select distinct column_name from information_schema.column_privileges
       where table_schema = 'public' and table_name = 'emergency_cards'
         and grantee = 'authenticated' and privilege_type = 'INSERT'
     ) s),
  array['allergies', 'blood_type', 'conditions', 'contacts', 'family_id', 'member_id', 'no_known_allergies', 'notes'],
  'authenticated só insere as colunas da ficha'
);
select is(
  (select array_agg(column_name::text order by column_name)
     from (
       select distinct column_name from information_schema.column_privileges
       where table_schema = 'public' and table_name = 'emergency_cards'
         and grantee = 'authenticated' and privilege_type = 'UPDATE'
     ) s),
  array['allergies', 'blood_type', 'conditions', 'contacts', 'no_known_allergies', 'notes'],
  'authenticated não atualiza id, família, membro, created_by nem datas'
);
select ok(
  (select provolatile = 'i' and proconfig::text like '%search_path=%'
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'emergency_card_lists_valid'),
  'validação das listas é immutable e tem search_path fixo'
);

-- ===== Setup
select tests.create_user('aaaaaaaa-0000-0000-0000-00000000000a', 'a@example.com');
select tests.create_user('bbbbbbbb-0000-0000-0000-00000000000b', 'b@example.com');
select tests.authenticate_as('aaaaaaaa-0000-0000-0000-00000000000a');
insert into tests.ctx select 'famA', id from public.create_family('Família A');
select tests.clear_authentication();
select tests.authenticate_as('bbbbbbbb-0000-0000-0000-00000000000b');
insert into tests.ctx select 'famB', id from public.create_family('Família B');
select tests.clear_authentication();

insert into public.members (id, family_id, full_name, relationship) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', tests.id('famA'), 'Pessoa A1', 'self'),
  ('aaaaaaaa-0000-0000-0000-0000000000a2', tests.id('famA'), 'Pessoa A2', 'child'),
  ('bbbbbbbb-0000-0000-0000-0000000000b1', tests.id('famB'), 'Pessoa B1', 'self');

-- ===== Integridade (como A, via RLS)
select tests.authenticate_as('aaaaaaaa-0000-0000-0000-00000000000a');

select lives_ok($$
  insert into public.emergency_cards (family_id, member_id)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1')
$$, 'ficha vazia é permitida');
select is(
  (select blood_type from public.emergency_cards where member_id = 'aaaaaaaa-0000-0000-0000-0000000000a1'),
  'unknown',
  'padrão do tipo sanguíneo é unknown'
);
select is(
  (select no_known_allergies from public.emergency_cards where member_id = 'aaaaaaaa-0000-0000-0000-0000000000a1'),
  false,
  'sem alergias conhecidas começa desmarcado'
);
select is(
  (select allergies::text || conditions::text || contacts::text
     from public.emergency_cards where member_id = 'aaaaaaaa-0000-0000-0000-0000000000a1'),
  '[][][]',
  'listas começam vazias'
);
select ok(
  (select notes is null from public.emergency_cards where member_id = 'aaaaaaaa-0000-0000-0000-0000000000a1'),
  'observações começam nulas'
);
select is(
  (select created_by from public.emergency_cards where member_id = 'aaaaaaaa-0000-0000-0000-0000000000a1'),
  'aaaaaaaa-0000-0000-0000-00000000000a'::uuid,
  'created_by é o usuário autenticado, sem grant de escrita'
);

select throws_ok($$
  insert into public.emergency_cards (family_id, member_id, blood_type)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a2', 'Z+')
$$, '23514', null, 'tipo sanguíneo inválido é rejeitado');
select throws_ok($$
  insert into public.emergency_cards (family_id, member_id, no_known_allergies, allergies)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a2', true, '[{"name":"Dipirona"}]'::jsonb)
$$, '23514', null, 'mutex: sem alergias conhecidas com lista é rejeitado');
select throws_ok($$
  insert into public.emergency_cards (family_id, member_id, contacts)
  values (
    tests.id('famA'),
    'aaaaaaaa-0000-0000-0000-0000000000a2',
    '[{"name":"C1","phone":"1"},{"name":"C2","phone":"2"},{"name":"C3","phone":"3"},{"name":"C4","phone":"4"}]'::jsonb
  )
$$, '23514', null, '4 contatos são rejeitados');
select throws_ok($$
  insert into public.emergency_cards (family_id, member_id, notes)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a2', repeat('x', 281))
$$, '23514', null, 'observações com 281 caracteres são rejeitadas');
select throws_ok($$
  insert into public.emergency_cards (family_id, member_id, allergies)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a2', '[{"reaction":"urticaria"}]'::jsonb)
$$, '23514', null, 'alergia sem nome é rejeitada');
select throws_ok($$
  insert into public.emergency_cards (family_id, member_id, contacts)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a2', '[{"name":"Sem telefone"}]'::jsonb)
$$, '23514', null, 'contato sem telefone é rejeitado');
select throws_ok($$
  insert into public.emergency_cards (family_id, member_id, conditions)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a2', '[{"name":"   "}]'::jsonb)
$$, '23514', null, 'condição só com espaços é rejeitada');
select throws_ok($$
  insert into public.emergency_cards (family_id, member_id, allergies)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a2', '[{"name":"Dipirona","extra":"x"}]'::jsonb)
$$, '23514', null, 'chave fora do contrato da alergia é rejeitada');
select throws_ok($$
  insert into public.emergency_cards (family_id, member_id)
  values (tests.id('famA'), 'bbbbbbbb-0000-0000-0000-0000000000b1')
$$, '23503', null, 'membro de outra família não passa na FK composta');

select lives_ok($$
  insert into public.emergency_cards (
    family_id, member_id, blood_type, no_known_allergies, allergies, conditions, contacts, notes
  ) values (
    tests.id('famA'),
    'aaaaaaaa-0000-0000-0000-0000000000a2',
    'A+',
    false,
    '[{"name":"Dipirona","reaction":"urticaria"}]'::jsonb,
    '[{"name":"Asma"}]'::jsonb,
    '[{"name":"Contato A","relation":"vizinho","phone":"11900000000"}]'::jsonb,
    'Texto curto'
  )
$$, 'ficha preenchida é aceita');
select throws_ok($$
  insert into public.emergency_cards (family_id, member_id)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1')
$$, '23505', null, 'segunda ficha do mesmo membro viola o unique');
select lives_ok($$
  update public.emergency_cards
  set contacts = '[
    {"name":"Um","phone":"1"},
    {"name":"Dois","relation":null,"phone":"2"},
    {"name":"Tres","relation":"vizinho","phone":"11900000000"}
  ]'::jsonb,
      notes = repeat('n', 280)
  where member_id = 'aaaaaaaa-0000-0000-0000-0000000000a2'
$$, '3 contatos e observações com 280 caracteres são aceitos');
select lives_ok($$
  update public.emergency_cards set no_known_allergies = true
  where member_id = 'aaaaaaaa-0000-0000-0000-0000000000a1'
$$, 'sem alergias conhecidas com lista vazia é aceito');
select throws_ok($$
  update public.emergency_cards set allergies = '[{"name":"Dipirona"}]'::jsonb
  where member_id = 'aaaaaaaa-0000-0000-0000-0000000000a1'
$$, '23514', null, 'mutex na atualização: lista com a marca ligada é rejeitada');
select throws_ok($$
  update public.emergency_cards set no_known_allergies = true
  where member_id = 'aaaaaaaa-0000-0000-0000-0000000000a2'
$$, '23514', null, 'mutex na atualização: marca com itens na lista é rejeitada');
select throws_ok($$
  update public.emergency_cards
  set allergies = (select jsonb_agg(jsonb_build_object('name', 'a' || g)) from generate_series(1, 51) g)
  where member_id = 'aaaaaaaa-0000-0000-0000-0000000000a2'
$$, '23514', null, 'mais de 50 alergias é rejeitado');
select throws_ok($$
  update public.emergency_cards set member_id = 'aaaaaaaa-0000-0000-0000-0000000000a2'
  where member_id = 'aaaaaaaa-0000-0000-0000-0000000000a1'
$$, '42501', null, 'member_id não é atualizável pela API');
select throws_ok($$
  update public.emergency_cards set family_id = tests.id('famB')
  where member_id = 'aaaaaaaa-0000-0000-0000-0000000000a1'
$$, '42501', null, 'family_id não é atualizável pela API');
select throws_ok($$
  insert into public.emergency_cards (family_id, member_id, created_by)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a2', 'bbbbbbbb-0000-0000-0000-00000000000b')
$$, '42501', null, 'created_by não é gravável pela API');

-- ===== Isolamento: A não alcança a ficha de B
select tests.clear_authentication();
insert into public.emergency_cards (
  family_id, member_id, blood_type, allergies, contacts
) values (
  tests.id('famB'),
  'bbbbbbbb-0000-0000-0000-0000000000b1',
  'O-',
  '[{"name":"Amendoim"}]'::jsonb,
  '[{"name":"Contato B","phone":"11800000000"}]'::jsonb
);

select tests.authenticate_as('aaaaaaaa-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.emergency_cards where family_id = tests.id('famB')), 0, 'A não lê a ficha de B');
select is((select count(*)::int from public.emergency_cards), 2, 'A vê só as duas fichas da própria família');
select throws_ok($$
  insert into public.emergency_cards (family_id, member_id)
  values (tests.id('famB'), 'bbbbbbbb-0000-0000-0000-0000000000b1')
$$, '42501', null, 'A não insere ficha na família B');
update public.emergency_cards set blood_type = 'AB+', notes = 'alterado' where family_id = tests.id('famB');
delete from public.emergency_cards where family_id = tests.id('famB');
select tests.clear_authentication();
select is(
  (select blood_type || '|' || (allergies -> 0 ->> 'name') || '|' || (contacts -> 0 ->> 'phone')
     from public.emergency_cards where member_id = 'bbbbbbbb-0000-0000-0000-0000000000b1'),
  'O-|Amendoim|11800000000',
  'update e delete de A não alteram a ficha de B'
);

select tests.authenticate_as_anon();
select throws_ok($$select count(*) from public.emergency_cards$$, '42501', null, 'anônimo não lê a ficha');
select tests.clear_authentication();

-- ===== Auditoria: só ids. Valores clínicos ficam na linha, nunca no evento.
select tests.authenticate_as('aaaaaaaa-0000-0000-0000-00000000000a');
delete from public.emergency_cards where member_id = 'aaaaaaaa-0000-0000-0000-0000000000a2';
select tests.clear_authentication();

select is(
  (select array_agg(distinct action order by action)
     from public.audit_events
    where entity = 'emergency_cards' and family_id = tests.id('famA')),
  array['DELETE', 'INSERT', 'UPDATE'],
  'INSERT, UPDATE e DELETE da ficha geram auditoria'
);
select is(
  (select count(*)::int from public.audit_events
    where entity = 'emergency_cards' and (family_id is null or entity_id is null)),
  0,
  'auditoria da ficha preenche family_id e entity_id'
);
select is(
  (select array_agg(column_name::text order by ordinal_position)
     from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_events'),
  array['id', 'family_id', 'actor_id', 'action', 'entity', 'entity_id', 'created_at'],
  'audit_events só tem colunas de ids, sem payload'
);
select ok(
  not exists (
    select 1 from public.audit_events e
    where e.entity = 'emergency_cards'
      and (
        to_jsonb(e)::text like '%Dipirona%'
        or to_jsonb(e)::text like '%11900000000%'
        or to_jsonb(e)::text like '%Amendoim%'
        or to_jsonb(e)::text like '%A+%'
        or to_jsonb(e)::text like '%O-%'
      )
  ),
  'auditoria da ficha não contém alergia, telefone nem tipo sanguíneo'
);

-- ===== Cascata (caminho do delete-account: apagar a família apaga a ficha; não há arquivo)
delete from public.members where id = 'aaaaaaaa-0000-0000-0000-0000000000a1';
select is(
  (select count(*)::int from public.emergency_cards where member_id = 'aaaaaaaa-0000-0000-0000-0000000000a1'),
  0,
  'apagar o membro apaga a ficha'
);
delete from public.families where id = tests.id('famB');
select is(
  (select count(*)::int from public.emergency_cards where family_id = tests.id('famB')),
  0,
  'apagar a família apaga a ficha (delete-account, sem passo de Storage)'
);

-- ===== Termo v3: accept_consent já troca a versão e guarda o histórico. Sem migração.
select tests.authenticate_as('aaaaaaaa-0000-0000-0000-00000000000a');
select lives_ok($$select public.accept_consent('terms_and_privacy', '2026-11-v2')$$, 'aceita v2 em terms_and_privacy');
select lives_ok($$select public.accept_consent('health_data_processing', '2026-11-v2')$$, 'aceita v2 em health_data_processing');
select is(
  (select count(*)::int from public.consents
    where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and version = '2026-11-v2' and revoked_at is null),
  2,
  'v2 vigente nas duas finalidades'
);
select is(
  (select version from public.consents
    where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and purpose = 'terms_and_privacy' and revoked_at is null),
  '2026-11-v2',
  'versão vigente de terms_and_privacy é 2026-11-v2'
);
select is(
  (select version from public.consents
    where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and purpose = 'health_data_processing' and revoked_at is null),
  '2026-11-v2',
  'versão vigente de health_data_processing é 2026-11-v2'
);

select lives_ok($$select public.accept_consent('terms_and_privacy', '2026-11-v3')$$, 'passa terms_and_privacy para 2026-11-v3');
select lives_ok($$select public.accept_consent('health_data_processing', '2026-11-v3')$$, 'passa health_data_processing para 2026-11-v3');
select is(
  (select count(*)::int from public.consents
    where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and purpose = 'terms_and_privacy'),
  2,
  'histórico de terms_and_privacy tem 2 linhas'
);
select is(
  (select count(*)::int from public.consents
    where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and purpose = 'health_data_processing'),
  2,
  'histórico de health_data_processing tem 2 linhas'
);
select is(
  (select version from public.consents
    where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and purpose = 'terms_and_privacy' and revoked_at is null),
  '2026-11-v3',
  'versão vigente de terms_and_privacy passa a ser 2026-11-v3'
);
select is(
  (select version from public.consents
    where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and purpose = 'health_data_processing' and revoked_at is null),
  '2026-11-v3',
  'versão vigente de health_data_processing passa a ser 2026-11-v3'
);
select ok(
  (select accepted_at is not null from public.consents
    where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and purpose = 'terms_and_privacy' and version = '2026-11-v3'),
  'accepted_at preenchido na v3 de terms_and_privacy'
);
select ok(
  (select accepted_at is not null from public.consents
    where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and purpose = 'health_data_processing' and version = '2026-11-v3'),
  'accepted_at preenchido na v3 de health_data_processing'
);
select ok(
  (select revoked_at is not null from public.consents
    where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and purpose = 'terms_and_privacy' and version = '2026-11-v2'),
  'a v2 de terms_and_privacy fica encerrada'
);
select ok(
  (select revoked_at is not null from public.consents
    where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and purpose = 'health_data_processing' and version = '2026-11-v2'),
  'a v2 de health_data_processing fica encerrada'
);

select lives_ok($$select public.accept_consent('terms_and_privacy', '2026-11-v3')$$, 'repetir a v3 em terms_and_privacy é idempotente');
select lives_ok($$select public.accept_consent('health_data_processing', '2026-11-v3')$$, 'repetir a v3 em health_data_processing é idempotente');
select is(
  (select count(*)::int from public.consents where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
  4,
  'repetir a v3 não duplica linhas'
);
select is(
  (select version from public.consents
    where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and purpose = 'terms_and_privacy' and revoked_at is not null),
  '2026-11-v2',
  'o titular ainda lê a v2 encerrada de terms_and_privacy'
);
select is(
  (select version from public.consents
    where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and purpose = 'health_data_processing' and revoked_at is not null),
  '2026-11-v2',
  'o titular ainda lê a v2 encerrada de health_data_processing'
);

select * from finish();
rollback;
