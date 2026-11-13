# Backend — Supabase

> v0.2 (11/11/2026: dados de acompanhamento de saúde). Ficha de emergência e termo v3 (12/11/2026). Dono: Backend Prontuário. Mudou o esquema, as políticas ou as funções? Atualize este arquivo no mesmo commit.

O backend é 100% Supabase (Auth, Postgres, Storage privado e duas Edge Functions). **Nada aqui depende de conta externa para rodar localmente.** O projeto real (sa-east-1) ainda não existe — ver [§9](#9-criar-o-projeto-real-sa-east-1).

```
supabase/
  config.toml              # Auth (OTP, Apple, Google), Storage (bucket), Edge Functions
  migrations/              # SQL versionado (ordem cronológica)
    20261111000001_core_schema.sql   # tabelas, índices, triggers, busca
    20261111000002_rls.sql           # RLS, grants por coluna, RPCs, auditoria
    20261111000003_storage.sql       # bucket health-files + políticas de storage.objects
    20261111000004_health_data.sql   # medições, doses de vacina, "Não se aplica", medicamentos (v0.2)
    20261112000001_emergency_cards.sql # ficha de emergência, 1:1 com members
  tests/                   # pgTAP (227 testes)
  templates/               # e-mail do código OTP em pt-BR
  functions/               # delete-account, export-my-data (+ _shared)
src/shared/api/            # cliente Supabase do app (anon key) + utilitários
src/entities/*/data/supabase-*.ts   # adaptadores das portas de domínio
```

## 1. Modelo de dados

```
auth.users ──1:1── profiles
auth.users ──1:n── consents
families ──1:n── family_memberships ──n:1── auth.users        (role: owner | editor)
families ──1:n── members ──1:1── emergency_cards   (ficha declarada; sem arquivo)
                   │        │
                   │        └──1:n── health_records ──1:n── attachments
                   │                     │
                   │                     └─(source_record_id, member_id, family_id)─┐  on delete cascade
                   ├─1:n── measurements             (kind lab | vital) ◄─────────────┤
                   ├─1:n── vaccine_doses                               ◄─────────────┤
                   ├─1:n── medications                                 ◄─────────────┘
                   └─1:n── vaccine_rule_dismissals  ("Não se aplica")
audit_events  (sem FKs: o histórico sobrevive à troca de dono/membros)
```

| Tabela | Observações |
| --- | --- |
| `profiles` | 1:1 com `auth.users`, criada por trigger (`handle_new_user`). Guarda e-mail e nome de exibição. |
| `families` | Nome de 2 a 60 caracteres. Criada **somente** pela RPC `create_family`. |
| `family_memberships` | PK `(family_id, user_id)`; `role` ∈ `owner`, `editor`. Fonte da verdade do acesso. |
| `members` | Pessoas cujo histórico é guardado (não precisam de conta). `relationship` e `sex` com CHECK. |
| `health_records` | `family_id` **desnormalizado** (RLS e consultas sem join). FK composta `(member_id, family_id) → members(id, family_id)`: é impossível ligar um registro a um membro de outra família. Coluna `search` (tsvector) mantida por trigger. |
| `attachments` | Só metadado; o arquivo fica no Storage. `id` é gerado pelo app (precisa estar no caminho). `storage_path` tem CHECK de formato `{family_id}/{record_id}/{id}.{ext}`. MIME restrito aos 6 tipos aceitos; ≤ 20 MiB. |
| `consents` | Histórico preservado (nada é apagado ao revogar). Índice único parcial: **um consentimento ativo por usuário/finalidade**. |
| `audit_events` | `action`, `entity`, `entity_id`, `actor_id`, `family_id`. **Nunca grava conteúdo de saúde**, só ids. |
| `measurements` | Exames (`kind = 'lab'`, manual ou lido por OCR) e sinais vitais (`kind = 'vital'`, só manual). `value`/`value2` são `numeric` (PostgREST devolve número JSON); `value2` (diastólica) existe **se e só se** `code = 'bp'`. Faixa do laudo em `reference_low`/`reference_high`/`reference_text` (`low <= high`). `taken_at` (hora), `context` (`fasting`, `post_meal`, `other`, só em `glucose_capillary`) e `note` (≤ 140). O `flag` (fora da faixa) **não é gravado**: o app calcula. |
| `vaccine_doses` | `vaccine_code` do calendário ou `other` (aí `vaccine_name` é obrigatório). `dose_key` ∈ `D1`, `D2`, `D3`, `R1`, `R2`, `R`, `DU`, `ANUAL`, `PERIODICA`, `OUTRA`; `dose_label` ≤ 40 é o texto exibido. `applied_on` nulo = "Não sei a data". |
| `vaccine_rule_dismissals` | "Não se aplica" numa regra do calendário (`rule_id`, `reason` ∈ `had_disease`, `professional_advice`, `other`, `note` ≤ 140). Única por `(member_id, rule_id)`. Sem update: desfazer apaga a linha. |
| `medications` | `start_on` obrigatório; `end_on` nulo = uso contínuo, e `end_on >= start_on`. "Em uso" é calculado no app no dia local, nunca com `current_date` do servidor (UTC). |
| `emergency_cards` | Uma linha por membro (`unique (member_id)`); sem linha = ficha vazia. `blood_type` ∈ `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`, `unknown` (padrão `unknown`; a UI mostra “Não sei”). `no_known_allergies` é mutuamente exclusivo com a lista `allergies`. Listas em JSONB: `allergies` `[{ "name", "reaction"? }]` (até 50), `conditions` `[{ "name" }]` (até 50), `contacts` `[{ "name", "relation"?, "phone" }]` (até 3). `notes` nulo ou até 280 caracteres. Identificação e remédios em uso **não** são colunas. |

Nas quatro tabelas novas: `family_id` desnormalizado, FK composta `(member_id, family_id) → members` com `on delete cascade`, `origin` ∈ `ocr`, `manual`, `created_by` com default `auth.uid()` e sem grant de escrita, `updated_at` por trigger (exceto em `vaccine_rule_dismissals`, que não muda). Em medições, doses e medicamentos, `source_record_id` liga o item ao documento de origem por FK composta `(source_record_id, member_id, family_id) → health_records(id, member_id, family_id)` com `on delete cascade`: o item é sempre da mesma pessoa e família do documento, e **apagar o documento apaga todos os itens ligados a ele**, inclusive os manuais em que a pessoa escolheu o documento (a UI avisa antes, A15). Para isso `health_records` ganhou `unique (id, member_id, family_id)`; a chave é estável porque `member_id` não tem grant de update.

O banco não conhece os catálogos: código existente, unidade compatível e data não futura são validados no app.

`emergency_cards` segue o mesmo desenho de família desnormalizada e FK composta `(member_id, family_id) → members(id, family_id)` com `on delete cascade` (apagar o membro ou a família apaga a ficha). Também tem `unique (id, family_id)`. Não há `origin` nem `source_record_id`: a ficha é declarada pela família, não lida de um documento, e não tem arquivo no Storage. `created_by` usa default `auth.uid()` e não tem grant de escrita. A forma de cada item JSONB (nome obrigatório, tamanhos, chaves do contrato, sem máscara de telefone) é um CHECK que chama `private.emergency_card_lists_valid` — função `immutable`, `search_path` fixo, no schema `private` (fora de `[api].schemas`, então não é endpoint).

**Termo de consentimento.** A versão vigente que o app passa a gravar é `2026-11-v3`, nas finalidades que já existem: `terms_and_privacy` e `health_data_processing`. Não há finalidade nova, nem CHECK com a string da versão, nem seed, nem migração: `version` continua só com comprimento de 1 a 40. A RPC `accept_consent` já troca a versão — se a linha ativa é outra, grava `revoked_at` nela e insere a nova, e o histórico permanece legível pelo titular. Aceitar de novo a mesma versão é idempotente. A v2 continua válida **para o resto do app só no cliente**; a ficha exige a v3, também só no cliente. A RLS desta ficha não consulta consentimento (o restante do app também exige o termo na guarda, não nas políticas).

Índices das tabelas novas:

| Índice | Para quê |
| --- | --- |
| `measurements (member_id, code, taken_on desc)` | série de um analito por pessoa (gráfico e tendência) |
| `measurements (family_id, taken_on desc)`, `vaccine_doses (family_id, applied_on desc)`, `medications (member_id, start_on desc)`, `medications (family_id, start_on desc)`, `vaccine_rule_dismissals (family_id)` | visões por pessoa e da família |
| único `measurements (source_record_id, code)` onde `source_record_id` não é nulo e `code <> 'other'` | reler o mesmo laudo não duplica um analito do catálogo; vários `other` no mesmo laudo são permitidos |
| único `vaccine_doses (member_id, vaccine_code, dose_key, applied_on)` | mesma dose na mesma data não duplica; doses sem data não colidem (null distinto) |
| `(source_record_id)` parcial nas três tabelas com documento de origem | cascata e "itens deste documento" |
| `emergency_cards (family_id)`; único em `member_id` | fichas da família; uma ficha por pessoa |

`updated_at` é mantido por trigger (`set_updated_at`). Todas as funções têm `search_path` fixo.

### Busca textual

`health_records.search` = tsvector com pesos (título A; profissional e local B; notas C), configuração `portuguese` e `unaccent` (busca "acao" encontra "Ação"). `unaccent()` não é IMMUTABLE, então o vetor é calculado por **trigger**, não por coluna gerada. Índice GIN `health_records_search_idx`.

A RPC `search_health_records(p_family_id, p_text, p_member_id, p_types)` (`security invoker`, a RLS continua valendo) transforma cada palavra em prefixo (`hemogr` encontra "hemograma"), combina com AND, ignora caracteres especiais e ordena por `record_date desc, created_at desc`.

## 2. Row Level Security

RLS está **habilitada em todas as 13 tabelas** (teste pgTAP falha se alguma ficar sem). Princípios:

- `anon` não tem **nenhum** grant. Sem login, nada é lido nem escrito (erro `42501`).
- `authenticated` recebe **grants por coluna**: o app não consegue escrever `created_by`, `search`, `created_at`, etc.
- O acesso é decidido por `is_family_member(family_id)` e `is_family_owner(family_id)`: funções `security definer`, `search_path` vazio, `STABLE`. Usadas nas políticas, evitam recursão entre `family_memberships` e as demais tabelas.

| Tabela | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| `profiles` | próprio | — (trigger) | próprio (`display_name`) | — |
| `families` | membros | — (RPC) | **owner** (`name`) | — |
| `family_memberships` | membros da mesma família | — | — | — |
| `members` | membros | membros | membros | membros |
| `health_records` | membros | membros | membros | membros |
| `attachments` | membros | membros | — | membros |
| `consents` | próprio | — (RPC) | — (RPC) | — |
| `audit_events` | **owner** da família | — (triggers) | — | — |
| `measurements` | membros | membros | membros (valores, faixa, data, hora, momento, nota) | membros |
| `vaccine_doses` | membros | membros | membros (vacina, dose, data, lote, local) | membros |
| `medications` | membros | membros | membros (nome, dosagem, instruções, início, término) | membros |
| `vaccine_rule_dismissals` | membros | membros | — (desfazer apaga) | membros |
| `emergency_cards` | membros | membros | membros (tipo sanguíneo, alergias, condições, contatos, observações) | membros |

Notas:

- Nas tabelas de saúde, `member_id`, `family_id`, `kind`, `code`, `source_record_id` e `origin` não são atualizáveis pela API (`42501`): para trocar de pessoa, apaga e cria.
- No MVP `editor` pode tudo em membros/registros/anexos e nos dados de saúde; só renomear a família e ler a auditoria é do `owner`. (Convites para outros responsáveis ainda não existem — ver [§10](#10-limitações-conhecidas-e-próximos-passos).)
- **RPCs** (todas `authenticated`; `anon` e `public` sem execute):
  - `create_family(p_name)` — cria a família e torna o chamador `owner`. Uma família própria por conta: repetir dá `P0001 family_already_exists`; nome inválido dá `22023`.
  - `accept_consent(p_purpose, p_version)` / `revoke_consent(p_purpose)` — gravam o histórico de consentimento. Trocar de `2026-11-v2` para `2026-11-v3` não precisa de função nova: a RPC encerra a linha ativa e insere a nova.
  - `log_data_export()` — registra a exportação na auditoria.
  - `search_health_records(...)` — busca (acima).
- **Auditoria**: triggers `audit_row_change` em `members`, `health_records`, `attachments`, `measurements`, `vaccine_doses`, `medications`, `vaccine_rule_dismissals` e `emergency_cards` registram quem fez o quê (insert/update/delete) sem conteúdo. O evento da ficha grava só `family_id`, `actor_id`, `action`, `entity`, `entity_id` — nunca alergia, tipo sanguíneo ou telefone.

### Testes (pgTAP)

```bash
npm run db:start   # sobe Postgres, Auth, Storage, Edge Runtime em Docker
npm run db:reset   # reaplica as migrations do zero
npm run db:test    # roda supabase/tests/*.test.sql
```

| Arquivo | O que prova |
| --- | --- |
| `01_schema.test.sql` | RLS ligada em todas as tabelas, conjunto esperado de tabelas, nenhum grant a `anon`, toda tabela tem política, bucket privado/limite/MIMEs, `search_path` das funções `security definer`, índice GIN, trigger de perfil, CHECKs, FK composta, tsvector com unaccent. |
| `02_rls_isolation.test.sql` | Usuário A **não lê, não insere, não altera e não apaga** nada da família de B em cada tabela; owner × editor; anônimo negado em tudo; histórico de consentimentos; auditoria; integridade e cascatas. |
| `04_health_data.test.sql` | Tabelas de saúde (39): inserção na própria família pela RLS; item lido precisa ser da mesma pessoa do documento; um analito por documento; sinal vital não vem do OCR; `value2` só em `bp`; faixa invertida e término antes do início rejeitados; dose duplicada rejeitada e doses sem data aceitas; `vaccine_name` em `other`; `context` só na glicemia capilar; "Não se aplica" único, sem update e desfeito por delete; `member_id` e `created_by` fora da API; A não lê, não altera e não apaga nada de B; anônimo negado; auditoria; apagar o documento apaga os itens ligados e mantém os manuais; apagar a família apaga tudo. |
| `05_emergency_cards.test.sql` | Ficha de emergência (70): colunas e tipos, RLS, índice, unique, FK composta com cascata, triggers, políticas, grants (anon zero; authenticated só as colunas liberadas), ficha vazia, CHECKs (tipo sanguíneo, mutex, 4 contatos, 281 caracteres, forma do JSONB), isolamento entre famílias, anon, auditoria só com ids, cascata ao apagar membro e família. Também a passagem do termo `2026-11-v2` → `2026-11-v3` em `terms_and_privacy` e `health_data_processing` (vigente, histórico, idempotência). |
| `03_storage_search.test.sql` | Políticas do Storage (insert/select/update/delete na própria e em outra família, anon, caminhos inválidos) e a busca (prefixo, acento, AND, caracteres especiais, texto de injeção, filtros, ordem, RLS, anon). |

## 3. Storage

- Bucket **`health-files`**, privado, 20 MiB por arquivo, MIMEs: `application/pdf`, `image/jpeg`, `image/png`, `image/heic`, `image/heif`, `image/webp`.
- Caminho: `{family_id}/{record_id}/{attachment_id}.{ext}`. As políticas de `storage.objects` usam o **primeiro segmento** (família) e `is_family_member`. O **insert** exige, além disso, caminho no formato exato e que o registro exista naquela família (`storage_path_is_valid_upload`).
- Nunca há URL pública: o app abre anexos com **URL assinada de 300 s** (`createSignedUrl`). A exportação LGPD usa 1 h.
- Upload no app: `new File(uri).arrayBuffer()` (expo-file-system SDK 58) → `storage.upload(path, bytes)`; o MIME e o tamanho real são revalidados antes.
- **Apagar arquivos não é possível em SQL** (o Supabase bloqueia `delete from storage.objects`). Por isso:
  - `HealthRecordRepository.remove` e `MemberRepository.remove` apagam os arquivos pela API de Storage **antes** de apagar no banco. Se o Storage falhar, nada é apagado no banco e o usuário pode repetir.
  - `delete-account` faz o mesmo para a família inteira.
  - Se o banco falhar *depois* de o arquivo sair, o arquivo some e o registro fica (repetir resolve). O inverso (arquivo órfão) só ocorreria por falha externa; um “varredor” periódico fica como melhoria futura.

## 4. Auth

- **E-mail OTP** de 6 dígitos, sem senha, `enable_signup = true`, validade de 1 h (`otp_expiry = 3600`), limite local de 30 e-mails/hora (`email_sent`). Template pt-BR em `supabase/templates/*.html` (usa `{{ .Token }}`). No app: `signInWithOtp` + `verifyOtp({ type: 'email' })`.
- **Apple (iOS, nativo)**: `expo-apple-authentication` + `signInWithIdToken({ provider: 'apple', token, nonce })`. O nonce cru vai ao Supabase e o SHA-256 vai à Apple. A Apple só informa o nome na primeira autorização; o app o guarda em `user_metadata.full_name`. `availableProviders()` só inclui `apple` no iOS quando `isAvailableAsync()` é verdadeiro.
- **Google (navegador, PKCE)**: `signInWithOAuth({ skipBrowserRedirect: true })` → `expo-web-browser.openAuthSessionAsync` → `exchangeCodeForSession(code)`. Só aparece com `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=1`.
- Redirect: `prontuariofamilia://auth/callback` (`additional_redirect_urls`; também `exp://127.0.0.1:8081/--/auth/callback` para Expo Go em dev).
- Cancelamento (Apple ou Google) lança `DomainError('auth/cancelled')`.
- Sessão persistida em **expo-secure-store** com chunking (limite ~2 KB por item); `autoRefreshToken` acompanha o `AppState` (pausa em segundo plano).
- Erros técnicos nunca chegam à UI: os adaptadores devolvem `DomainError` com código estável e mensagem em pt-BR (sem conteúdo de saúde).

## 5. Edge Functions

Ambas exigem JWT (`verify_jwt = true` no gateway **e** validação dentro da função). O `user id` vem sempre do token, nunca do corpo.

### `delete-account` — exclusão definitiva (LGPD art. 18, VI)

Única função com **service role** (injetada pelo runtime; nunca no app nem no repositório). Passos, nesta ordem:

1. Identifica o usuário pelo JWT.
2. Acha as famílias em que ele é o **único owner**.
3. Apaga do Storage todos os arquivos dessas famílias (caminhos de `attachments` + varredura do prefixo, em lotes de 100). **Se falhar, aborta antes de tocar no banco.**
4. Apaga as famílias (cascata: membros — inclusive a ficha de emergência, que não tem arquivo —, registros, anexos, memberships e o restante dos dados de saúde) e a auditoria delas e do próprio usuário.
5. Apaga o usuário em `auth.users` (cascata: perfil, consentimentos, memberships restantes).

Idempotente: se qualquer passo antes do 5 falhar, o usuário continua existente e pode repetir. Resposta: `{ "deleted": true, "families_deleted": n }`. Os logs só contêm o motivo técnico, nunca dados de saúde.

> Atenção: se a família tiver um `editor`, os dados dela **também** são apagados (o dono pediu a exclusão e é o único owner). Quando houver convites, avisar na UI e/ou transferir a propriedade antes.

### `export-my-data` — portabilidade (LGPD art. 18, II e V)

Roda com o **JWT do usuário** (sem service role): a RLS decide o que sai. Devolve JSON `{ exported_at, format_version: 3, profile, families, family_memberships, members, health_records[ { ..., attachments[ { ..., download_url } ] } ], consents, measurements, vaccine_doses, medications, vaccine_rule_dismissals, emergency_cards }`. As `download_url` são assinadas e expiram em 60 min. Registra a exportação via `log_data_export()`.

- `format_version` 2 (v0.2) acrescentou as quatro coleções de saúde no nível de cima, não aninhadas em `health_records`, porque medições e medicamentos manuais não têm documento; `source_record_id` liga ao registro quando há. O `flag` não é exportado (é derivado); a faixa e o texto da referência são.
- `format_version` 3 acrescenta `emergency_cards` no nível de cima, com `id`, `family_id`, `member_id`, `blood_type`, `no_known_allergies`, `allergies`, `conditions`, `contacts`, `notes`, `created_at`, `updated_at` (JSONB inteiro). `created_by` fica de fora, como nas outras coleções. `consents` continua `purpose`, `version`, `accepted_at`, `revoked_at` — a troca v2 → v3 aparece nesse histórico, sem campo novo.
- O log da função só tem a mensagem técnica do erro, nunca valor de saúde.

`delete-account` não ganhou passo novo: apagar a família cascateia `members` → medições, doses, medicamentos, "Não se aplica" e a ficha de emergência. A ficha não tem arquivo, então não há varredura de Storage para ela. O passo que apaga `audit_events` por `family_id` já cobre a auditoria da ficha (cascata testada em `05_emergency_cards.test.sql`).

### Rodar localmente

```bash
npx supabase@latest functions serve          # serve ambas em http://127.0.0.1:54321/functions/v1/<nome>
```

> Só em desenvolvimento local, as URLs assinadas da exportação vêm com host interno `http://kong:8000` (é o `SUPABASE_URL` visto de dentro do container). Em produção é a URL pública do projeto.

## 6. Adaptadores no app

| Fábrica | Porta |
| --- | --- |
| `createSupabaseAuthGateway(client)`, `createSupabaseDataExportGateway(client)` | `AuthGateway`, `DataExportGateway` |
| `createSupabaseFamilyRepository(client)` | `FamilyRepository` |
| `createSupabaseMemberRepository(client)` | `MemberRepository` |
| `createSupabaseHealthRecordRepository(client)`, `createSupabaseAttachmentStorage(client)` | `HealthRecordRepository`, `AttachmentStorage` |
| `createSupabaseConsentRepository(client)` | `ConsentRepository` |

O client vem de `getSupabaseClient()` (`@/shared/api`), singleton que usa **apenas a anon key**. Cada slice tem `supabase-mappers.ts` (snake_case ↔ camelCase) e testes Jest com um dublê do client (`src/shared/api/mock-client.ts`).

Detalhes que valem lembrar:

- `getMyFamily()` devolve a associação `owner` primeiro (MVP: 1 família por conta).
- `list()` seleciona colunas explícitas (nunca o tsvector) e traz os anexos num só round-trip; com `text` usa a RPC de busca.
- Falha de rede/banco vira `DomainError` (`family/…`, `member/…`, `record/…`, `attachment/…`, `consent/…`, `auth/…`, `account/delete-failed`, `export/failed`).

## 7. Rodar tudo localmente

Requisitos: Docker Desktop em execução.

```bash
npm run db:start                       # primeira vez baixa as imagens; Studio/Realtime/etc. ficam desligados
npx supabase@latest status             # mostra API URL e a anon key local
cp .env.example .env                   # preencha EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY
npx supabase@latest functions serve    # em outro terminal, para excluir conta/exportar
npm start
```

- **E-mails OTP locais**: caixa de entrada de teste (Inbucket) em <http://127.0.0.1:54324>.
- No celular físico a URL precisa ser o IP da máquina (não `127.0.0.1`).
- `npm run db:reset` recria o banco do zero (apaga os dados locais). `npm run db:stop` desliga os containers.
- As chaves locais impressas pelo CLI são fixas e **públicas** (demonstração); não são segredos.

## 8. Segredos

| O quê | Onde fica |
| --- | --- |
| URL e **anon key** | `.env` → `EXPO_PUBLIC_*` (vai no bundle; é público por design) |
| **service role key** | Só no runtime das Edge Functions (injetada pelo Supabase). **Nunca** em `.env` do app, no código ou no git |
| Secrets do Apple/Google | `supabase/.env` (local, ignorado pelo git) e painel do Supabase (produção) |
| Chave `.p8` da Apple | Guardar fora do repositório (cofre de senhas) |

`.env`, `.env.local`, `supabase/.env` estão no `.gitignore`.

## 9. Criar o projeto real (sa-east-1)

> Depende do Douglas: criar a conta/organização no Supabase e o projeto. Nada abaixo foi executado.

1. Em supabase.com → **New project** → região **South America (São Paulo) — `sa-east-1`** (dados de saúde de brasileiros: latência e residência). Plano **Pro** recomendado (backups diários, sem pausa por inatividade, SMTP próprio). Guardar a senha do banco no cofre.
2. Vincular e subir o esquema (o ref aparece na URL do projeto):
   ```bash
   npx supabase@latest login
   npx supabase@latest link --project-ref <ref>
   npx supabase@latest db push                         # aplica supabase/migrations
   npx supabase@latest functions deploy delete-account
   npx supabase@latest functions deploy export-my-data
   ```
   As funções recebem `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` automaticamente.
3. **Auth** (o `config.toml` só vale no local; em produção configure no painel ou com `npx supabase@latest config push` depois de revisar o diff):
   - Site URL `prontuariofamilia://auth/callback`; Redirect URLs: `prontuariofamilia://**`.
   - E-mail: provedor habilitado, **Confirm email** ligado, código OTP de 6 dígitos; colar os templates de `supabase/templates/` (Magic Link e Confirm signup) com assunto “Seu código de acesso ao Prontuário da Família”.
   - **SMTP próprio** (Resend, SES, Postmark…): o e-mail embutido do Supabase tem limite muito baixo e não serve para lançamento. Remetente com SPF/DKIM do domínio do app.
   - Revisar limites de taxa (e-mails por hora, tentativas de verificação).
4. **Storage**: o bucket `health-files` é criado pela migration (privado, 20 MiB, MIMEs). Conferir no painel que continua **privado**.
5. Ligar **backups diários** (e PITR se o orçamento permitir) e alertas de uso.
6. No app (EAS): `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` como variáveis de ambiente dos perfis de build (`eas.json`/EAS Environment Variables). Sem elas, o build de produção falha de propósito (ver `src/shared/config/env.ts`).
7. Rodar os testes pgTAP localmente antes de cada `db push` e, após o primeiro deploy, um teste manual: criar conta → família → registro com anexo → exportar → excluir conta.

### Apple e Google (dependem do Douglas)

**Sign in with Apple** (obrigatório na App Store se houver login social):
1. Apple Developer Program ativo; no App ID do app (`Bundle ID`), habilitar a capability **Sign in with Apple** (o `app.json` já tem `ios.usesAppleSignIn: true` e o plugin `expo-apple-authentication`).
2. No Supabase → Authentication → Providers → Apple: habilitar e informar o **Bundle ID** em *Client IDs*. Para o fluxo **nativo** não é preciso o secret; ele só é exigido para o OAuth web (Services ID + chave `.p8`, JWT que expira em até 6 meses e precisa ser renovado). Confirmar nos docs do Supabase ao configurar.
3. Local: `SUPABASE_AUTH_EXTERNAL_APPLE_CLIENT_ID` em `supabase/.env` e `enabled = true` em `[auth.external.apple]`.

**Google** (fluxo no navegador):
1. Google Cloud Console → APIs e serviços → Credenciais → **ID do cliente OAuth** do tipo **Aplicativo da Web**; tela de consentimento OAuth configurada (nome do app, e-mail de suporte, domínio, política de privacidade).
2. URI de redirecionamento autorizado: `https://<ref>.supabase.co/auth/v1/callback`.
3. No Supabase → Providers → Google: colar Client ID e Client Secret.
4. No app: `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=1` no build.
5. Local: `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID/SECRET` em `supabase/.env` e `enabled = true` em `[auth.external.google]`.

## 10. Limitações conhecidas e próximos passos

- **Convites para outros responsáveis**: o modelo (`family_memberships` com `editor`, RLS e testes) já os suporta, mas **não há fluxo de convite** (RPC/Edge Function de convite com token e expiração). Fora do escopo do MVP.
- **Transferência de propriedade** e **sair da família** não existem; a exclusão de conta apaga a família se o usuário for o único owner.
- **Arquivos órfãos** após falhas externas: criar um varredor periódico (Edge Function agendada comparando `storage.objects` × `attachments`).
- **Atualização de registro** (`updateRecord`) ainda não está na porta `HealthRecordRepository`; as políticas e as colunas liberadas para `update` já existem.
- **Retenção da auditoria**: hoje ela é apagada junto com a conta; definir com jurídico se algum evento precisa ser retido.
- **Rate limiting** de buscas e exportações (hoje só o do Auth).
- **Busca por analito ou medicamento**: `search_health_records` só olha os registros. Juntar medições e medicamentos (join ou tsvector próprio) fica para depois da v0.2.
- **Texto lido pelo OCR não é guardado** (minimização). O desenho de `extracted_texts` com opt-in está em `docs/features/dados-saude-backend.md` §5, se a busca dentro dos documentos for pedida.
