# Dados de acompanhamento de saúde — proposta de backend (Supabase) e modo demo

> Versão 0.2 · 11/11/2026 (revisão de consistência da Fase A; versão 0.1 no mesmo dia) · dono: Arquitetura mobile (OCR e parser), para revisão do Backend Prontuário · status: **proposta**; nada aplicado em `supabase/` nem em `src/`.
> Contexto: [ocr-tecnico.md](ocr-tecnico.md) · [ADR 0001](../adr/0001-ocr-no-aparelho.md) · padrão existente: `supabase/migrations/2026111100000{1,2,3}_*.sql`, `supabase/tests/*.test.sql`, `docs/BACKEND.md`.

**Revisão de consistência (11/11/2026, Fase A).** O SQL e o pgTAP abaixo foram ajustados à spec da Head de Produto (§6 e P6 de `v0.2-saude-da-familia.md`): `measurements.taken_at/context/note`, `vaccine_doses.dose_key/vaccine_name` e `applied_on` opcional, a tabela `vaccine_rule_dismissals`, o índice único de medições sem `other` e o índice de doses por `dose_key`. **Esta versão ajustada ainda não foi executada**: a fatia de backend roda `npm run db:test` de novo antes de aceitar. A verificação abaixo vale para a versão anterior.

**Verificado (versão anterior).** A migração e o teste pgTAP abaixo foram aplicados num Postgres descartável (imagem `supabase/postgres:17.11.0.018`, já presente no Docker local, removida depois), em cima das migrações 1 e 2 atuais:
- `04_health_data.test.sql`: **30/30** ok.
- `02_rls_isolation.test.sql` existente: **68/68** ok com a migração nova (a restrição única extra em `health_records` não quebra nada).
- `01_schema.test.sql`: falha no item "conjunto esperado de tabelas", como esperado, porque precisa listar as 3 tabelas novas (§3). Os itens de Storage não rodaram, porque a imagem sem o `storage-api` não tem `storage.buckets` (limitação do ambiente).

A migração 3 (Storage) não foi aplicada pelo mesmo motivo.

## 1. Modelo

```
families ─1:n─ members ─1:n─ health_records ─1:n─ attachments
                   │               │
                   │               └─(source_record_id, member_id, family_id)─┐  on delete cascade
                   ├─1:n─ measurements      (kind lab | vital) ◄──────────────┤
                   ├─1:n─ vaccine_doses                      ◄────────────────┤
                   └─1:n─ medications                        ◄────────────────┘
```

Contrato de dados (semente do Douglas), com os refinamentos e o motivo de cada um:

| Campo | Semente | Proposta | Motivo |
|---|---|---|---|
| `Measurement.flag` | — | **não gravar**; `computeFlag(value, referenceLow, referenceHigh)` no app | fonte única; não fica errado quando o usuário corrige valor ou faixa |
| `VaccineDose.origin`, `Medication.origin` | só em `Measurement` | `'ocr' \| 'manual'` nas três | auditar e filtrar o que veio da leitura automática; mesma regra para os três |
| `createdBy`, `updatedAt` | — | nas três (`created_by` com default `auth.uid()`, sem grant de escrita) | padrão de `health_records`; edição é permitida |
| `sourceRecordId` | opcional | FK **composta** `(source_record_id, member_id, family_id)` → `health_records`, `on delete cascade` | o item derivado é sempre da **mesma pessoa e família** do documento; apagar o documento apaga o que foi lido dele (manuais ficam) |
| `Medication.endOn` | `null` = uso contínuo | igual; `"não sei"` nunca é salvo (a revisão obriga a escolher) | a coluna nula não distingue "contínuo" de "desconhecido" |
| `VaccineDose.doseLabel` | obrigatório | obrigatório (≤ 40), derivado de `doseKey` quando vazio | texto exibido |
| `VaccineDose.doseKey` | — | `'D1'…'OUTRA'` (spec §6), obrigatório | a pendência conta doses por série e posição (R8); texto livre não é comparável |
| `VaccineDose.appliedOn` | obrigatório | **opcional** (`null` = "Não sei a data") | carteira antiga sem data legível (spec §6) |
| `VaccineDose.vaccineName` | — | obrigatório se `vaccineCode = 'other'` | vacina fora do PNI |
| `Measurement.takenAt`, `context`, `note` | — | hora; momento da glicemia capilar (`fasting`/`post_meal`/`other`, só em `glucose_capillary`); nota ≤ 140 | spec §6 |
| `VaccineRuleDismissal` | — | tabela `vaccine_rule_dismissals` (motivo, reversível = apagar) | "Não se aplica" (F3.7, P1) |
| `Measurement.value` | `number` | `numeric` (PostgREST devolve número JSON) | sem erro de ponto flutuante em 7,8 × 1000 etc. |

Regras que ficam **no app** (o banco não conhece o catálogo): `code` existe no catálogo de analitos/vacinas; unidade compatível; data não futura no dia local; status "em uso" de medicamento (`end_on is null or end_on >= hoje`, no dia local do usuário, nunca `current_date` do servidor em UTC).

## 2. Migração `supabase/migrations/20261111000004_health_data.sql`

```sql
-- Prontuário da Família — acompanhamento de saúde: medições (exames e sinais vitais), doses de vacina e medicamentos.
-- Mesmo padrão de health_records: family_id desnormalizado para RLS, FK composta com members, RLS por is_family_member,
-- grants por coluna, updated_at e auditoria (só ids) por trigger.
-- source_record_id liga o item ao documento de onde foi lido; apagar o registro apaga os itens derivados dele.

-- Permite FK composta (registro de origem, pessoa, família): o item derivado é da mesma pessoa do documento.
-- health_records.member_id não é atualizável pela API (grant de update sem member_id), então a chave é estável.
alter table public.health_records
  add constraint health_records_id_member_family_key unique (id, member_id, family_id);

-- ---------------------------------------------------------------------------
-- measurements (kind 'lab' = exame laboratorial; 'vital' = sinal vital manual)
-- ---------------------------------------------------------------------------

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  member_id uuid not null,
  kind text not null check (kind in ('lab', 'vital')),
  code text not null check (code ~ '^[a-z0-9_]{1,40}$'),
  label text not null check (char_length(btrim(label)) between 1 and 120),
  value numeric not null check (value > -1000000000 and value < 1000000000),
  value2 numeric check (value2 is null or (value2 > -1000000000 and value2 < 1000000000)),
  unit text not null default '' check (char_length(unit) <= 30),
  reference_low numeric,
  reference_high numeric,
  reference_text text check (reference_text is null or char_length(reference_text) <= 200),
  taken_on date not null check (taken_on >= date '1900-01-01'),
  taken_at time,
  context text check (context is null or context in ('fasting', 'post_meal', 'other')),
  note text check (note is null or char_length(note) <= 140),
  source_record_id uuid,
  origin text not null check (origin in ('ocr', 'manual')),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (member_id, family_id) references public.members (id, family_id) on delete cascade,
  foreign key (source_record_id, member_id, family_id) references public.health_records (id, member_id, family_id) on delete cascade,
  -- o momento (jejum, após refeição) só existe na glicemia capilar
  check (context is null or code = 'glucose_capillary'),
  check (reference_low is null or reference_high is null or reference_low <= reference_high),
  -- só a pressão arterial tem segundo valor (diastólica)
  check ((code = 'bp') = (value2 is not null)),
  -- sinais vitais não vêm do OCR nesta versão
  check (kind = 'lab' or origin = 'manual')
);

create index measurements_member_code_date_idx on public.measurements (member_id, code, taken_on desc);
create index measurements_family_date_idx on public.measurements (family_id, taken_on desc);
-- um valor por analito do catálogo por documento (reler o mesmo laudo não duplica); 'other' fica de fora porque um laudo
-- pode ter vários exames fora do catálogo. Também atende o cascade por source_record_id.
create unique index measurements_source_code_idx on public.measurements (source_record_id, code) where source_record_id is not null and code <> 'other';
create index measurements_source_idx on public.measurements (source_record_id) where source_record_id is not null;

create trigger measurements_set_updated_at
  before update on public.measurements
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- vaccine_doses
-- ---------------------------------------------------------------------------

create table public.vaccine_doses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  member_id uuid not null,
  vaccine_code text not null check (vaccine_code ~ '^[a-z0-9_]{1,40}$'),
  vaccine_name text check (vaccine_name is null or char_length(btrim(vaccine_name)) between 1 and 120),
  dose_key text not null check (dose_key in ('D1', 'D2', 'D3', 'R1', 'R2', 'R', 'DU', 'ANUAL', 'PERIODICA', 'OUTRA')),
  dose_label text not null check (char_length(btrim(dose_label)) between 1 and 40),
  applied_on date check (applied_on is null or applied_on >= date '1900-01-01'), -- null = "Não sei a data"
  lot text check (lot is null or char_length(lot) <= 40),
  location text check (location is null or char_length(location) <= 200),
  source_record_id uuid,
  origin text not null check (origin in ('ocr', 'manual')),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (member_id, family_id) references public.members (id, family_id) on delete cascade,
  foreign key (source_record_id, member_id, family_id) references public.health_records (id, member_id, family_id) on delete cascade,
  check (vaccine_code <> 'other' or vaccine_name is not null)
);

-- mesma dose na mesma data não duplica; doses sem data (applied_on null) não colidem entre si (null distinto no Postgres)
create unique index vaccine_doses_unique_dose_idx on public.vaccine_doses (member_id, vaccine_code, dose_key, applied_on);
create index vaccine_doses_family_idx on public.vaccine_doses (family_id, applied_on desc);
create index vaccine_doses_source_idx on public.vaccine_doses (source_record_id) where source_record_id is not null;

create trigger vaccine_doses_set_updated_at
  before update on public.vaccine_doses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- vaccine_rule_dismissals ("Não se aplica" numa regra do calendário; desfazer = apagar a linha)
-- ---------------------------------------------------------------------------

create table public.vaccine_rule_dismissals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  member_id uuid not null,
  rule_id text not null check (rule_id ~ '^[a-z0-9_]{1,60}$'),
  reason text not null check (reason in ('had_disease', 'professional_advice', 'other')),
  note text check (note is null or char_length(note) <= 140),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (member_id, family_id) references public.members (id, family_id) on delete cascade,
  unique (member_id, rule_id)
);

create index vaccine_rule_dismissals_family_idx on public.vaccine_rule_dismissals (family_id);

-- ---------------------------------------------------------------------------
-- medications (em uso = end_on is null or end_on >= hoje; calculado no app, no dia local)
-- ---------------------------------------------------------------------------

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  member_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  dosage text check (dosage is null or char_length(dosage) <= 60),
  instructions text check (instructions is null or char_length(instructions) <= 500),
  start_on date not null check (start_on >= date '1900-01-01'),
  end_on date, -- null = uso contínuo
  source_record_id uuid,
  origin text not null check (origin in ('ocr', 'manual')),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (member_id, family_id) references public.members (id, family_id) on delete cascade,
  foreign key (source_record_id, member_id, family_id) references public.health_records (id, member_id, family_id) on delete cascade,
  check (end_on is null or end_on >= start_on)
);

create index medications_member_idx on public.medications (member_id, start_on desc);
create index medications_family_idx on public.medications (family_id, start_on desc);
create index medications_source_idx on public.medications (source_record_id) where source_record_id is not null;

create trigger medications_set_updated_at
  before update on public.medications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS, grants por coluna e auditoria
-- ---------------------------------------------------------------------------

alter table public.measurements enable row level security;
alter table public.vaccine_doses enable row level security;
alter table public.medications enable row level security;
alter table public.vaccine_rule_dismissals enable row level security;

revoke all on public.measurements, public.vaccine_doses, public.medications, public.vaccine_rule_dismissals from anon, authenticated;

grant select, delete on public.measurements, public.vaccine_doses, public.medications, public.vaccine_rule_dismissals to authenticated;

grant insert (family_id, member_id, kind, code, label, value, value2, unit, reference_low, reference_high, reference_text,
              taken_on, taken_at, context, note, source_record_id, origin)
  on public.measurements to authenticated;
grant update (label, value, value2, unit, reference_low, reference_high, reference_text, taken_on, taken_at, context, note)
  on public.measurements to authenticated;

grant insert (family_id, member_id, vaccine_code, vaccine_name, dose_key, dose_label, applied_on, lot, location, source_record_id, origin)
  on public.vaccine_doses to authenticated;
grant update (vaccine_code, vaccine_name, dose_key, dose_label, applied_on, lot, location) on public.vaccine_doses to authenticated;

-- sem update: desfazer "Não se aplica" apaga a linha
grant insert (family_id, member_id, rule_id, reason, note) on public.vaccine_rule_dismissals to authenticated;

grant insert (family_id, member_id, name, dosage, instructions, start_on, end_on, source_record_id, origin)
  on public.medications to authenticated;
grant update (name, dosage, instructions, start_on, end_on) on public.medications to authenticated;

create policy measurements_select on public.measurements
  for select to authenticated using (public.is_family_member(family_id));
create policy measurements_insert on public.measurements
  for insert to authenticated with check (public.is_family_member(family_id));
create policy measurements_update on public.measurements
  for update to authenticated
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));
create policy measurements_delete on public.measurements
  for delete to authenticated using (public.is_family_member(family_id));

create policy vaccine_doses_select on public.vaccine_doses
  for select to authenticated using (public.is_family_member(family_id));
create policy vaccine_doses_insert on public.vaccine_doses
  for insert to authenticated with check (public.is_family_member(family_id));
create policy vaccine_doses_update on public.vaccine_doses
  for update to authenticated
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));
create policy vaccine_doses_delete on public.vaccine_doses
  for delete to authenticated using (public.is_family_member(family_id));

create policy medications_select on public.medications
  for select to authenticated using (public.is_family_member(family_id));
create policy medications_insert on public.medications
  for insert to authenticated with check (public.is_family_member(family_id));
create policy medications_update on public.medications
  for update to authenticated
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));
create policy medications_delete on public.medications
  for delete to authenticated using (public.is_family_member(family_id));

create policy vaccine_rule_dismissals_select on public.vaccine_rule_dismissals
  for select to authenticated using (public.is_family_member(family_id));
create policy vaccine_rule_dismissals_insert on public.vaccine_rule_dismissals
  for insert to authenticated with check (public.is_family_member(family_id));
create policy vaccine_rule_dismissals_delete on public.vaccine_rule_dismissals
  for delete to authenticated using (public.is_family_member(family_id));

create trigger measurements_audit
  after insert or update or delete on public.measurements
  for each row execute function public.audit_row_change();
create trigger vaccine_doses_audit
  after insert or update or delete on public.vaccine_doses
  for each row execute function public.audit_row_change();
create trigger medications_audit
  after insert or update or delete on public.medications
  for each row execute function public.audit_row_change();
create trigger vaccine_rule_dismissals_audit
  after insert or delete on public.vaccine_rule_dismissals
  for each row execute function public.audit_row_change();
```

Notas:
- **Grants por coluna**, no padrão atual. Não se troca `member_id`, `family_id`, `kind`, `code` nem `source_record_id` por update: para mudar de pessoa, apaga e cria. Por isso a FK composta com `member_id` é estável. `health_records` já não dá grant de update em `member_id`.
- **Índices**: tendência por pessoa e analito (`member_id, code, taken_on desc`); visão da família por data; `source_record_id` parcial (cascade e "itens deste documento"). Os índices únicos impedem duplicar ao reler o mesmo documento: um analito do catálogo por documento (`other` pode repetir), e uma dose por (pessoa, vacina, `dose_key`, data). Doses sem data não colidem.
- **Auditoria** com o `audit_row_change` existente: grava só ids, nunca valor de exame.
- **Busca**: fica como está nesta rodada (o título sugerido já carrega o grupo, ex.: "Perfil lipídico e tireoide"). Buscar por analito ou nome de medicamento é melhoria futura (join no `search_health_records` ou tsvector próprio).

## 3. Testes pgTAP

Novo `supabase/tests/04_health_data.test.sql` (34 testes; mesmos helpers de `02_rls_isolation.test.sql`). Quatro testes cobrem os campos da revisão de consistência (isolamento de `vaccine_rule_dismissals` no bloco "A não lê" e três antes de `finish()`):

```sql
-- pgTAP: medições, doses de vacina e medicamentos — RLS entre famílias, integridade e cascatas.
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

select plan(34);

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
        + (select count(*)::int from public.medications where family_id = tests.id('famB')), 0, 'apagar a família apaga os dados de saúde');

-- campos da revisão de consistência (como superusuário; a RLS já foi coberta acima)
select throws_ok($$
  insert into public.measurements (family_id, member_id, kind, code, label, value, unit, taken_on, context, origin)
  values (tests.id('famA'), 'aaaaaaaa-0000-0000-0000-0000000000a1', 'vital', 'weight', 'Peso', 70, 'kg', '2026-11-10', 'fasting', 'manual')
$$, '23514', null, 'momento só na glicemia capilar');
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
```

Ajustes nos testes existentes:
- `01_schema.test.sql`, teste 2: o array esperado passa a ser `array['attachments', 'audit_events', 'consents', 'families', 'family_memberships', 'health_records', 'measurements', 'medications', 'members', 'profiles', 'vaccine_doses', 'vaccine_rule_dismissals']`. Os testes "toda tabela tem RLS", "anon sem grants" e "toda tabela tem política" passam a cobrir as novas sem mudança.
- `docs/BACKEND.md`: tabela de RLS, contagem de testes (118 → 152, a confirmar na execução) e §1 do modelo.

## 4. Exportação, exclusão e cascatas

### 4.1 `export-my-data` (LGPD art. 18, II e V)

Roda com o JWT do usuário; a RLS decide o que sai. Acrescentar quatro consultas e subir `format_version` para 2 (spec P6):

```ts
const [/* …atuais… */, measurements, vaccineDoses, medications, vaccineRuleDismissals] = await Promise.all([
  /* …atuais… */
  db.from('measurements').select('id,family_id,member_id,kind,code,label,value,value2,unit,reference_low,reference_high,reference_text,taken_on,taken_at,context,note,source_record_id,origin,created_at,updated_at'),
  db.from('vaccine_doses').select('id,family_id,member_id,vaccine_code,vaccine_name,dose_key,dose_label,applied_on,lot,location,source_record_id,origin,created_at,updated_at'),
  db.from('medications').select('id,family_id,member_id,name,dosage,instructions,start_on,end_on,source_record_id,origin,created_at,updated_at'),
  db.from('vaccine_rule_dismissals').select('id,family_id,member_id,rule_id,reason,note,created_at'),
]);
// incluir no laço de erros e no payload:
//   format_version: 2,
//   measurements: measurements.data ?? [], vaccine_doses: vaccineDoses.data ?? [], medications: medications.data ?? [],
//   vaccine_rule_dismissals: vaccineRuleDismissals.data ?? [],
```

Itens no nível de cima (não aninhados em `health_records`), porque medições e medicamentos manuais não têm documento de origem. `source_record_id` liga ao registro quando há. O `flag` não é exportado (é derivado); a faixa e o texto da referência são.

### 4.2 `delete-account` (LGPD art. 18, VI)

**Sem mudança de código.** Apagar as famílias em que o usuário é o único owner cascateia `members` → `measurements`/`vaccine_doses`/`medications`/`vaccine_rule_dismissals` (FK `(member_id, family_id)`, `on delete cascade`), e o passo que apaga `audit_events` por `family_id` já cobre as linhas de auditoria das tabelas novas (elas gravam `family_id`). O último teste do `04_health_data.test.sql` prova a cascata a partir de `families`. Não há arquivo novo no Storage.

### 4.3 Exclusão de registro e de membro

- `HealthRecordRepository.remove` (Supabase): o `on delete cascade` de `source_record_id` apaga **todos os itens ligados ao documento**, inclusive os manuais em que a pessoa escolheu o documento de origem (F2.5). A confirmação na UI usa a A15 da spec: "Este documento tem {n} itens de saúde ligados a ele. Eles também serão apagados." O `{n}` vem de `listBySourceRecord` das três portas. ~~Copy anterior: "…O que você cadastrou à mão continua."~~ (falsa quando o item manual tem documento de origem).
- `MemberRepository.remove`: cascata pela FK do membro.

## 5. Texto extraído (`extracted_texts`) — não criar agora

**Decisão desta rodada: não persistir o texto completo** (motivos em [ocr-tecnico.md §g](ocr-tecnico.md#g-privacidade-e-lgpd): minimização, segunda cópia de dado sensível, superfície em exportação e exclusão). Se a Head de Produto pedir "buscar dentro dos documentos", o desenho seria:

- tabela `extracted_texts (attachment_id uuid primary key references attachments(id) on delete cascade, family_id uuid not null, record_id uuid not null, text text not null check (char_length(text) <= 200000), search tsvector, engine text, created_at)`, com FK composta `(record_id, family_id)` → `health_records`, RLS por `is_family_member`, sem grant de update, GIN em `search` e o mesmo trigger `unaccent` + `portuguese`;
- **opt-in explícito** nos Ajustes ("Guardar o texto dos documentos para busca"), desligado por padrão, com exclusão de todo o texto ao desligar;
- entraria na exportação (`extracted_texts[]`) e cairia na exclusão por cascata;
- a busca juntaria `health_records.search` com `extracted_texts.search`.

## 6. App: portas, adaptadores e modo demo local

### 6.1 Entities novas (cada uma com `domain/`, `data/`, `model/`, `ui/`, `index.ts`)

Nomes das entities alinhados à spec e ao DESIGN.md: `measurement`, **`vaccine`** (não `vaccination`), `medication`. Contrato congelado no plano de implementação (`v0.2-plano-implementacao.md` §3).

| Entity | Porta | Supabase | Local (demo) |
|---|---|---|---|
| `measurement` | `MeasurementRepository { listByMember(memberId), listByFamily(familyId), listBySourceRecord(recordId), createMany(items), update(id, changes), remove(id) }` | `supabase-measurement-repository.ts` + mappers snake↔camel | `local-measurement-repository.ts` |
| `vaccine` | `VaccineDoseRepository { listByMember, listByFamily, listBySourceRecord, createMany, update, remove, listDismissals(memberId), listFamilyDismissals(familyId), dismiss(input), undismiss(id) }` | `supabase-vaccine-dose-repository.ts` | `local-vaccine-dose-repository.ts` |
| `medication` | `MedicationRepository { listByMember, listByFamily, listBySourceRecord, createMany, update, remove }` | `supabase-medication-repository.ts` | `local-medication-repository.ts` |

`createMany` = um `insert([...]).select()` por tabela no Supabase (atômico por tabela). A atomicidade entre registro, anexos e as três tabelas fica no caso de uso `addRecord` (compensação, ver ocr-tecnico §f). `DEPENDENCY_KEYS` ganha `measurements`, `vaccineDoses`, `medications` (e `documentText`); `AppPorts`/`createLocalPorts`/`createSupabasePorts` e `containerDependencies` recebem as três portas.

### 6.2 Modo demo (`src/shared/lib/local-db`)

- `LOCAL_COLLECTIONS` ganha `measurements: 'measurements'`, `vaccineDoses: 'vaccineDoses'`, `medications: 'medications'`, `vaccineRuleDismissals: 'vaccineRuleDismissals'` (chaves `pf:db:<coleção>`).
- **Exclusão de conta**: sem mudança. `db.clear()` apaga todas as chaves `pf:db:*` e `clearLocalFiles()` apaga os anexos.
- **Exportação local** (`createLocalDataExportGateway`): acrescentar `measurements`, `vaccineDoses`, `medications` e `vaccineRuleDismissals` filtrados por `inMyFamilies`, no mesmo JSON (`source: 'demo'`).
- **Cascatas emuladas nos adaptadores locais**, como o `local-member-repository` já faz com `records`:
  - `createLocalHealthRecordRepository.remove(id)`: depois de remover os arquivos e o registro, remove das três coleções os documentos com `sourceRecordId === id`;
  - `createLocalMemberRepository.remove(id)`: remove das quatro coleções os documentos com `memberId === id`.
- **Integridade local**: os adaptadores locais validam o que o banco valida: membro da família, `sourceRecordId` do mesmo membro, únicos (analito do catálogo por documento, dose por `doseKey` e data, "Não se aplica" por regra), `end_on >= start_on`, `value2` só em `bp`, `context` só em `glucose_capillary`, `vaccineName` em `other`. Assim o modo demo não aceita o que o Supabase recusaria. Lançam `DomainError` com os mesmos códigos dos adaptadores Supabase.
- Testes: estender `local-health-record-repository.test.ts`, `local-member-repository` e `local-data-export-gateway.test.ts`, e criar os testes dos três repositórios locais (cascata, filtro por família, únicos, exportação, `clear`).

### 6.3 Ordem sugerida de implementação

1. Migração + `04_health_data.test.sql` + ajuste do `01_schema` → `npm run db:test`.
2. Entities `measurement` (com catálogo e `computeFlag`), `vaccine`, `medication`: domínio, adaptadores local e Supabase, testes.
3. `features/read-document` (porta, parser, fixtures, adaptadores demo e indisponível) e `addRecord` com `healthData`: tudo testável no Expo Go em modo demo.
4. Módulo nativo `modules/document-text` + adaptador nativo → development build (ocr-tecnico §h.3).
5. Export/delete (Edge Function de exportação) e textos de termo e política.
