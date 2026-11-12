-- Prontuário da Família — acompanhamento de saúde: medições (exames e sinais vitais), doses de vacina,
-- "Não se aplica" de regras do calendário e medicamentos.
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
