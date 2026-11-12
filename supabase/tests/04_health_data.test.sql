-- pgTAP: medições, doses de vacina, "Não se aplica" e medicamentos — RLS entre famílias, integridade e cascatas.
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

select plan(39);

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
insert into public.health_records (id, family_id, member_id, type, title, record_date) values
  ('aaaaaaaa-0000-0000-0000-0000000000d1', tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'result', 'Hemograma', '2026-11-03'),
  ('bbbbbbbb-0000-0000-0000-0000000000d1', tests.id('famB'), 'bbbbbbbb-0000-0000-0000-0000000000b1', 'result', 'Exame B', '2026-11-03');

-- ===== Como A: insere na própria família (via RLS)
select tests.authenticate_as('aaaaaaaa-0000-0000-0000-00000000000a');

select lives_ok($$
  insert into public.measurements (family_id, member_id, kind, code, label, value, unit, reference_low, reference_high, reference_text, taken_on, source_record_id, origin)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'lab', 'hemoglobin', 'Hemoglobina', 11.2, 'g/dL', 12, 15.5, '12,0 a 15,5 g/dL', '2026-11-03', 'aaaaaaaa-0000-0000-0000-0000000000d1', 'ocr')
$$, 'A insere medição lida do próprio documento');
select lives_ok($$
  insert into public.measurements (family_id, member_id, kind, code, label, value, value2, unit, taken_on, origin)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'vital', 'bp', 'Pressão arterial', 120, 80, 'mmHg', '2026-11-10', 'manual')
$$, 'A insere pressão manual (sistólica/diastólica)');
select lives_ok($$
  insert into public.vaccine_doses (family_id, member_id, vaccine_code, dose_key, dose_label, applied_on, lot, source_record_id, origin)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'influenza', 'ANUAL', 'Dose anual', '2026-04-15', 'FLU26A0412', 'aaaaaaaa-0000-0000-0000-0000000000d1', 'ocr')
$$, 'A insere dose de vacina');
select lives_ok($$
  insert into public.medications (family_id, member_id, name, dosage, start_on, end_on, source_record_id, origin)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'Amoxicilina', '500 mg', '2026-11-02', '2026-11-08', 'aaaaaaaa-0000-0000-0000-0000000000d1', 'ocr')
$$, 'A insere medicamento');
select lives_ok($$
  insert into public.medications (family_id, member_id, name, start_on, origin)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a2', 'Losartana', '2026-01-01', 'manual')
$$, 'A insere medicamento de uso contínuo (end_on nulo)');

-- "Não se aplica": uma linha por regra, sem update; desfazer = apagar
select lives_ok($$
  insert into public.vaccine_rule_dismissals (family_id, member_id, rule_id, reason, note)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a2', 'varicella_d1', 'had_disease', 'Teve catapora')
$$, 'A marca "Não se aplica" numa regra da própria família');
select throws_ok($$
  insert into public.vaccine_rule_dismissals (family_id, member_id, rule_id, reason)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a2', 'varicella_d1', 'other')
$$, '23505', null, '"Não se aplica" uma vez por pessoa e regra');
select throws_ok($$
  update public.vaccine_rule_dismissals set reason = 'other' where rule_id = 'varicella_d1'
$$, '42501', null, '"Não se aplica" não é atualizável pela API');
delete from public.vaccine_rule_dismissals where rule_id = 'varicella_d1';
select is((select count(*)::int from public.vaccine_rule_dismissals), 0, 'desfazer "Não se aplica" apaga a linha');

-- integridade
select throws_ok($$
  insert into public.measurements (family_id, member_id, kind, code, label, value, unit, taken_on, source_record_id, origin)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a2', 'lab', 'glucose_fasting', 'Glicose', 92, 'mg/dL', '2026-11-03', 'aaaaaaaa-0000-0000-0000-0000000000d1', 'ocr')
$$, '23503', null, 'item derivado precisa ser da mesma pessoa do documento');
select throws_ok($$
  insert into public.measurements (family_id, member_id, kind, code, label, value, unit, taken_on, source_record_id, origin)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'lab', 'hemoglobin', 'Hemoglobina', 12, 'g/dL', '2026-11-03', 'aaaaaaaa-0000-0000-0000-0000000000d1', 'ocr')
$$, '23505', null, 'um valor por analito por documento');
select lives_ok($$
  insert into public.measurements (family_id, member_id, kind, code, label, value, unit, taken_on, origin)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'lab', 'hemoglobin', 'Hemoglobina', 12.9, 'g/dL', '2026-06-01', 'manual')
$$, 'medição manual do mesmo analito em outra data é permitida');
select throws_ok($$
  insert into public.measurements (family_id, member_id, kind, code, label, value, unit, taken_on, origin)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'vital', 'weight', 'Peso', 70, 'kg', '2026-11-10', 'ocr')
$$, '23514', null, 'sinal vital não vem do OCR');
select throws_ok($$
  insert into public.measurements (family_id, member_id, kind, code, label, value, value2, unit, taken_on, origin)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'lab', 'glucose_fasting', 'Glicose', 92, 1, 'mg/dL', '2026-11-03', 'manual')
$$, '23514', null, 'value2 só na pressão arterial');
select throws_ok($$
  insert into public.measurements (family_id, member_id, kind, code, label, value, unit, reference_low, reference_high, taken_on, origin)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'lab', 'tsh', 'TSH', 2, 'µUI/mL', 4.5, 0.45, '2026-11-03', 'manual')
$$, '23514', null, 'faixa invertida é rejeitada');
select throws_ok($$
  insert into public.medications (family_id, member_id, name, start_on, end_on, origin)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'Dipirona', '2026-11-02', '2026-11-01', 'manual')
$$, '23514', null, 'término antes do início é rejeitado');
select throws_ok($$
  insert into public.vaccine_doses (family_id, member_id, vaccine_code, dose_key, dose_label, applied_on, origin)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'influenza', 'ANUAL', 'Dose anual', '2026-04-15', 'manual')
$$, '23505', null, 'mesma dose na mesma data não duplica');
select throws_ok($$
  update public.measurements set member_id = 'aaaaaaaa-0000-0000-0000-0000000000a2' where code = 'hemoglobin'
$$, '42501', null, 'member_id não é atualizável pela API');
select throws_ok($$
  insert into public.measurements (family_id, member_id, kind, code, label, value, unit, taken_on, origin, created_by)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'lab', 'tsh', 'TSH', 2, 'µUI/mL', '2026-11-03', 'manual', 'bbbbbbbb-0000-0000-0000-00000000000b')
$$, '42501', null, 'created_by não é gravável pela API');

-- isolamento: A não alcança a família B
select throws_ok($$
  insert into public.measurements (family_id, member_id, kind, code, label, value, unit, taken_on, origin)
  values (tests.id('famB'), 'bbbbbbbb-0000-0000-0000-0000000000b1', 'lab', 'tsh', 'TSH', 2, 'µUI/mL', '2026-11-03', 'manual')
$$, '42501', null, 'A não insere medição na família B');
select throws_ok($$
  insert into public.measurements (family_id, member_id, kind, code, label, value, unit, taken_on, origin)
  values (tests.id('famA'), 'bbbbbbbb-0000-0000-0000-0000000000b1', 'lab', 'tsh', 'TSH', 2, 'µUI/mL', '2026-11-03', 'manual')
$$, '23503', null, 'membro de outra família não passa na FK composta');
select tests.clear_authentication();

-- dados de B (como superusuário)
insert into public.measurements (family_id, member_id, kind, code, label, value, unit, taken_on, origin)
values (tests.id('famB'), 'bbbbbbbb-0000-0000-0000-0000000000b1', 'lab', 'tsh', 'TSH', 3.1, 'µUI/mL', '2026-11-03', 'manual');
insert into public.vaccine_doses (family_id, member_id, vaccine_code, dose_key, dose_label, applied_on, origin)
values (tests.id('famB'), 'bbbbbbbb-0000-0000-0000-0000000000b1', 'bcg', 'DU', 'Dose única', '1990-01-10', 'manual');
insert into public.vaccine_rule_dismissals (family_id, member_id, rule_id, reason)
values (tests.id('famB'), 'bbbbbbbb-0000-0000-0000-0000000000b1', 'varicella_d1', 'had_disease');
insert into public.medications (family_id, member_id, name, start_on, origin)
values (tests.id('famB'), 'bbbbbbbb-0000-0000-0000-0000000000b1', 'Levotiroxina', '2025-01-01', 'manual');

select tests.authenticate_as('aaaaaaaa-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.measurements where family_id = tests.id('famB')), 0, 'A não lê medições de B');
select is((select count(*)::int from public.vaccine_doses where family_id = tests.id('famB')), 0, 'A não lê vacinas de B');
select is((select count(*)::int from public.medications where family_id = tests.id('famB')), 0, 'A não lê medicamentos de B');
select is((select count(*)::int from public.vaccine_rule_dismissals where family_id = tests.id('famB')), 0, 'A não lê "Não se aplica" de B');
update public.medications set name = 'Hackeado' where family_id = tests.id('famB');
delete from public.vaccine_doses where family_id = tests.id('famB');
select is((select count(*)::int from public.measurements), 3, 'A vê só as próprias 3 medições');
select tests.clear_authentication();
select is((select name from public.medications where family_id = tests.id('famB')), 'Levotiroxina', 'update de A não alcança B');
select is((select count(*)::int from public.vaccine_doses where family_id = tests.id('famB')), 1, 'delete de A não alcança B');

-- anônimo
select tests.authenticate_as_anon();
select throws_ok($$ select count(*) from public.measurements $$, '42501', null, 'anônimo não lê medições');
select tests.clear_authentication();

-- auditoria: só ids
select ok(
  exists (select 1 from public.audit_events where entity = 'measurements' and action = 'INSERT' and family_id = tests.id('famA')),
  'inserção de medição gera auditoria (sem conteúdo)'
);

-- cascatas: apagar o documento apaga os itens derivados e mantém os manuais
delete from public.health_records where id = 'aaaaaaaa-0000-0000-0000-0000000000d1';
select is((select count(*)::int from public.measurements where family_id = tests.id('famA') and origin = 'ocr'), 0, 'medições do documento somem com ele');
select is((select count(*)::int from public.measurements where family_id = tests.id('famA') and origin = 'manual'), 2, 'medições manuais ficam');
select is((select count(*)::int from public.vaccine_doses where family_id = tests.id('famA')), 0, 'vacina do documento some com ele');
select is((select count(*)::int from public.medications where family_id = tests.id('famA')), 1, 'medicamento manual fica');

-- apagar a família (caminho do delete-account) leva tudo
delete from public.families where id = tests.id('famB');
select is((select count(*)::int from public.measurements where family_id = tests.id('famB'))
        + (select count(*)::int from public.vaccine_doses where family_id = tests.id('famB'))
        + (select count(*)::int from public.medications where family_id = tests.id('famB'))
        + (select count(*)::int from public.vaccine_rule_dismissals where family_id = tests.id('famB')), 0, 'apagar a família apaga os dados de saúde');

-- campos da revisão de consistência (como superusuário; a RLS já foi coberta acima)
select throws_ok($$
  insert into public.measurements (family_id, member_id, kind, code, label, value, unit, taken_on, context, origin)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'vital', 'weight', 'Peso', 70, 'kg', '2026-11-10', 'fasting', 'manual')
$$, '23514', null, 'momento só na glicemia capilar');
select lives_ok($$
  insert into public.measurements (family_id, member_id, kind, code, label, value, unit, taken_on, taken_at, context, note, origin)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'vital', 'glucose_capillary', 'Glicemia capilar', 98, 'mg/dL', '2026-11-10', '07:30', 'fasting', 'Antes do café', 'manual')
$$, 'glicemia capilar aceita hora, momento e nota');
select throws_ok($$
  insert into public.vaccine_doses (family_id, member_id, vaccine_code, dose_key, dose_label, applied_on, origin)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'other', 'DU', 'Dose única', '2026-01-10', 'manual')
$$, '23514', null, 'vacina other exige nome');
select lives_ok($$
  insert into public.vaccine_doses (family_id, member_id, vaccine_code, dose_key, dose_label, applied_on, origin) values
    (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'hepatitis_b', 'D1', '1ª dose', null, 'manual'),
    (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'hepatitis_b', 'D1', '1ª dose', null, 'manual')
$$, 'doses sem data não colidem');

select * from finish();
rollback;
