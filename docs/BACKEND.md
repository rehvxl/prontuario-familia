# Backend — Supabase

> v0.1.2 · dono: Backend Prontuário. Mudou o esquema, as políticas ou as funções? Atualize este arquivo no mesmo commit.

O backend é 100% Supabase (Auth, Postgres, Storage privado e duas Edge Functions). **Nada aqui depende de conta externa para rodar localmente.** O projeto real (sa-east-1) ainda não existe — ver [§9](#9-criar-o-projeto-real-sa-east-1).

```
supabase/
  config.toml              # Auth (OTP, Apple, Google), Storage (bucket), Edge Functions
  migrations/              # SQL versionado (ordem cronológica)
    20261111000001_core_schema.sql   # tabelas, índices, triggers, busca
    20261111000002_rls.sql           # RLS, grants por coluna, RPCs, auditoria
    20261111000003_storage.sql       # bucket health-files + políticas de storage.objects
  tests/                   # pgTAP (118 testes)
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
families ──1:n── members ──1:n── health_records ──1:n── attachments
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

`updated_at` é mantido por trigger (`set_updated_at`). Todas as funções têm `search_path` fixo.

### Busca textual

`health_records.search` = tsvector com pesos (título A; profissional e local B; notas C), configuração `portuguese` e `unaccent` (busca "acao" encontra "Ação"). `unaccent()` não é IMMUTABLE, então o vetor é calculado por **trigger**, não por coluna gerada. Índice GIN `health_records_search_idx`.

A RPC `search_health_records(p_family_id, p_text, p_member_id, p_types)` (`security invoker`, a RLS continua valendo) transforma cada palavra em prefixo (`hemogr` encontra "hemograma"), combina com AND, ignora caracteres especiais e ordena por `record_date desc, created_at desc`.

## 2. Row Level Security

RLS está **habilitada em todas as 8 tabelas** (teste pgTAP falha se alguma ficar sem). Princípios:

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

Notas:

- No MVP `editor` pode tudo em membros/registros/anexos; só renomear a família e ler a auditoria é do `owner`. (Convites para outros responsáveis ainda não existem — ver [§10](#10-limitações-conhecidas-e-próximos-passos).)
- **RPCs** (todas `authenticated`; `anon` e `public` sem execute):
  - `create_family(p_name)` — cria a família e torna o chamador `owner`. Uma família própria por conta: repetir dá `P0001 family_already_exists`; nome inválido dá `22023`.
  - `accept_consent(p_purpose, p_version)` / `revoke_consent(p_purpose)` — gravam o histórico de consentimento.
  - `log_data_export()` — registra a exportação na auditoria.
  - `search_health_records(...)` — busca (acima).
- **Auditoria**: triggers `audit_row_change` em `members`, `health_records` e `attachments` registram quem fez o quê (insert/update/delete) sem conteúdo.

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
4. Apaga as famílias (cascata: membros, registros, anexos, memberships) e a auditoria delas e do próprio usuário.
5. Apaga o usuário em `auth.users` (cascata: perfil, consentimentos, memberships restantes).

Idempotente: se qualquer passo antes do 5 falhar, o usuário continua existente e pode repetir. Resposta: `{ "deleted": true, "families_deleted": n }`. Os logs só contêm o motivo técnico, nunca dados de saúde.

> Atenção: se a família tiver um `editor`, os dados dela **também** são apagados (o dono pediu a exclusão e é o único owner). Quando houver convites, avisar na UI e/ou transferir a propriedade antes.

### `export-my-data` — portabilidade (LGPD art. 18, II e V)

Roda com o **JWT do usuário** (sem service role): a RLS decide o que sai. Devolve JSON `{ exported_at, format_version, profile, families, family_memberships, members, health_records[ { ..., attachments[ { ..., download_url } ] } ], consents }`. As `download_url` são assinadas e expiram em 60 min. Registra a exportação via `log_data_export()`.

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
