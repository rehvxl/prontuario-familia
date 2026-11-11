# Prontuário da Família — Arquitetura

> MVP v0.1 · novembro/2026 · dono: Tech Lead Prontuário. Mudou algo estrutural? Atualize este arquivo no mesmo commit.

## 1. Decisões (ADR resumido)

| # | Decisão | Por quê | Alternativas descartadas |
|---|---|---|---|
| 1 | **Expo SDK 58 (React Native 0.88, New Architecture, Hermes)** com Continuous Native Generation (`ios/` e `android/` não versionados) | Um código para iOS e Android, builds e envio às lojas pelo EAS sem manter projetos nativos. Expo é o framework recomendado pelo próprio React Native. | RN CLI "puro" (mais manutenção nativa sem ganho). |
| 2 | **expo-router** (rotas em arquivo, typed routes) | Padrão do Expo, deep links (`prontuariofamilia://`) prontos para o callback de login. | React Navigation manual. |
| 3 | **TypeScript estrito** (`strict`, `noUncheckedIndexedAccess`) | Dado de saúde errado é bug caro. | — |
| 4 | **Clean Architecture + Feature-Sliced Design**, imposto por lint (`eslint-plugin-boundaries` + `no-restricted-imports`) | Domínio testável sem React Native, backend trocável, fronteiras que não erodem com o tempo. | Pastas por tipo (`components/`, `services/`). |
| 5 | **Supabase** (Auth, Postgres com RLS, Storage privado), região **São Paulo (sa-east-1)** | Auth com OTP/Apple/Google pronto, RLS no banco (a segurança não depende do app), dados no Brasil. | Firebase (regras menos expressivas para "família"), backend próprio (mais tempo). |
| 6 | **Login sem senha**: e-mail + código de 6 dígitos (OTP), **Sign in with Apple** (obrigatório no iOS quando há login social — App Store Guideline 4.8) e **Google** | Menor atrito e nada de senha para vazar ou recuperar; aceito pelas duas lojas. | Senha (suporte de "esqueci a senha"), magic link (quebra quando o e-mail abre em outro aparelho). |
| 7 | **Google via OAuth no navegador do sistema** (`signInWithOAuth` + `expo-web-browser`, PKCE) e **Apple nativo** (`expo-apple-authentication` + `signInWithIdToken`) | Não exige SDK nativo do Google nem development build para testar; Apple nativo é o que a revisão espera. | `@react-native-google-signin` (exige dev build e configuração nativa — fica como melhoria). |
| 8 | **Modo demonstração local** quando não há `EXPO_PUBLIC_SUPABASE_URL` | O app abre e todos os fluxos rodam no simulador sem conta em serviço externo; os mesmos casos de uso rodam sobre adaptadores locais. Desligado em builds de produção. | Mock de rede (frágil). |
| 9 | **TanStack Query** para estado do servidor; **React Context** para o container de dependências; sem Redux | Cache, loading/erro e invalidação prontos; pouco estado global de verdade. | Redux/Zustand para tudo. |
| 10 | **Sessão em armazenamento seguro** (`expo-secure-store` com chave AES; dados cifrados no AsyncStorage) | Tokens nunca em texto puro; SecureStore tem limite de tamanho por item. | AsyncStorage puro. |
| 11 | **PDF**: iOS em `react-native-webview` (renderização nativa); Android baixa para o cache do app e abre com o leitor do sistema (`expo-intent-launcher`). **Imagens**: `expo-image` com URL assinada. | Sem enviar o documento a visualizadores de terceiros. | Google Docs Viewer (vaza o dado). |
| 12 | **UI nativa por plataforma**: `@expo/ui` (SwiftUI/Jetpack Compose), `expo-glass-effect` (Liquid Glass), `expo-symbols` + `@expo/material-symbols`, `NativeTabs` e `Stack.Toolbar`/`Stack.SearchBar` do expo-router, sheets nativas (`formSheet`). iOS 26 = Liquid Glass; Android = Material 3. Tudo encapsulado em `src/shared/ui` (telas não importam a biblioteca direto). Decidido em 11/11/2026 após revisão visual do Douglas. | Visual atual do sistema (vidro real, título grande, tab bar flutuante) sem imitação, acessibilidade e Dynamic Type nativos, e menos código de UI próprio. | Kits JS (Tamagui, gluestack, HeroUI Native): desenham uma imitação e não acompanham o iOS. |

## 2. Camadas (FSD) e segmentos (Clean)

```
src/
├── app/            # ROTAS do expo-router (finas: só re-exportam telas de src/screens). Camada "routes".
├── application/    # Camada "app" do FSD: providers, composição/DI (container), tema, query client.
├── screens/        # Camada "pages" do FSD: uma tela por slice (login, timeline, record-detail...).
├── widgets/        # Blocos de tela compostos (timeline-list, member-header...).
├── features/       # Ações do usuário com regra de negócio (auth, create-family, add-record, search...).
├── entities/       # Conceitos do negócio: session, family, member, health-record, consent.
└── shared/         # Sem negócio: ui (design system), lib, config, api (cliente Supabase).
```

Dentro de **entities/** e **features/**, cada slice separa:

```
entities/health-record/
├── domain/   # Tipos, regras e PORTAS (interfaces). TypeScript puro: sem React, RN, Expo, Supabase.
├── data/     # ADAPTADORES que implementam as portas: supabase-*.ts e local-*.ts (modo demo).
├── ui/       # Componentes de apresentação do conceito (ex.: RecordCard).
├── model/    # (opcional) hooks React Query que ligam ui ↔ casos de uso.
└── index.ts  # API PÚBLICA do slice. Fora do slice, só se importa daqui.
```

Casos de uso (`features/*/domain/*.ts`) são funções puras que recebem as portas por parâmetro:

```ts
// features/add-record/domain/add-record.ts
export async function addRecord(deps: { records: HealthRecordRepository; storage: AttachmentStorage },
                                input: AddRecordInput): Promise<HealthRecord> { /* valida, cria, envia anexos */ }
```

### Regras de import (impostas por `npm run lint`)

| De ↓ / pode importar → | routes | app | screens | widgets | features | entities | shared |
|---|---|---|---|---|---|---|---|
| routes (`src/app`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| app (`src/application`) | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| screens | | | mesmo slice | ✓ | ✓ | ✓ | ✓ |
| widgets | | | | mesmo slice | ✓ | ✓ | ✓ |
| features | | | | | mesmo slice | ✓ | ✓ |
| entities | | | | | | mesmo slice | ✓ |
| shared | | | | | | | ✓ |

Regras extras:
- **Slices da mesma camada não se importam** (feature não importa feature; entity não importa entity). Precisou? Suba a composição para a camada de cima.
- **API pública**: fora do slice, `@/entities/member` — nunca `@/entities/member/domain/member`. Dentro do slice, caminhos relativos.
- **`domain/` é puro**: proibido importar `react`, `react-native`, `expo*`, `@supabase/*`, AsyncStorage, TanStack, Zustand, e qualquer `data/` ou `ui/`.
- **`data/` não importa `ui/`**.
- Configuração: `eslint.config.js`. Violação = erro de lint = CI vermelho.

## 3. Composição (injeção de dependências)

`src/application/container.ts` monta um objeto `AppContainer` com as implementações das portas:

```ts
interface AppContainer {
  mode: 'supabase' | 'demo';
  auth: AuthGateway; families: FamilyRepository; members: MemberRepository;
  records: HealthRecordRepository; storage: AttachmentStorage; consents: ConsentRepository;
  dataExport: DataExportGateway;
}
```

- Com `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` → adaptadores `supabase-*` de cada entity.
- Sem elas e com `__DEV__` (ou `EXPO_PUBLIC_DEMO_MODE=1`) → adaptadores `local-*` (AsyncStorage + `expo-file-system`). Código OTP de demonstração: **123456**. Um selo "Modo demonstração" aparece no app.
- Build de produção sem as variáveis → erro de configuração na abertura (nunca cai em demo silenciosamente).

O container é entregue por `ContainerProvider` (React Context); hooks em `model/` usam `useContainer()` e chamam os casos de uso. Testes trocam o container por fakes em memória.

## 4. Navegação (expo-router)

```
src/app/
├── _layout.tsx                 # Providers (container, React Query, tema, safe area) + guarda de sessão
├── (onboarding)/welcome.tsx    # Boas-vindas
├── (onboarding)/consent.tsx    # Aceite LGPD
├── (auth)/sign-in.tsx          # E-mail / Apple / Google
├── (auth)/verify.tsx           # Código de 6 dígitos
├── auth/callback.tsx           # Retorno do OAuth (deep link)
├── (setup)/family.tsx          # Criar família
├── (setup)/members.tsx         # Adicionar primeiros membros
└── (main)/                     # Abas
    ├── index.tsx               # Família: membros
    ├── search.tsx              # Busca global
    ├── settings.tsx            # Ajustes, exportar, excluir conta
    ├── member/[id].tsx         # Linha do tempo do membro + filtro por tipo
    ├── member/new.tsx · member/[id]/edit.tsx
    ├── record/new.tsx          # Adicionar registro (com anexos)
    └── record/[id].tsx         # Detalhe + visualizador de anexo
```

Guarda (em `_layout`): sem consentimento → onboarding; sem sessão → auth; sem família → setup; senão → main.

## 5. Modelo de dados (Supabase / Postgres)

```
auth.users ─1:1─ profiles
families ─1:n─ family_memberships ─n:1─ auth.users      (role: owner | editor)
families ─1:n─ members ─1:n─ health_records ─1:n─ attachments
auth.users ─1:n─ consents                               (purpose, version, accepted_at, revoked_at)
```

- PKs `uuid`; `created_at`/`updated_at` com trigger; `health_records.family_id` desnormalizado para RLS e consulta.
- Busca textual: coluna `search tsvector` (config `portuguese` + `unaccent`) com índice GIN em `health_records`.
- Detalhes, migrações e testes: `supabase/` e `docs/BACKEND.md`.

### Segurança (RLS e Storage)

- **RLS habilitada em todas as tabelas**, sem exceção. Política base: o usuário só enxerga linhas de famílias em que tem `family_memberships`. Função `is_family_member(family_id)` em `security definer` com `search_path` fixo.
- **Bucket `health-files` privado**. Caminho `{family_id}/{record_id}/{attachment_id}.{ext}`; políticas de `storage.objects` checam o primeiro segmento do caminho contra as famílias do usuário. Leitura apenas por **URL assinada de curta duração** (padrão 5 min).
- Limites: 20 MB por arquivo; tipos aceitos: PDF, JPEG, PNG, HEIC/HEIF, WEBP.
- **Exclusão de conta**: função `delete_my_account()` (Edge Function com service role) remove arquivos do storage, famílias das quais é único `owner`, e o usuário em `auth.users` (cascade).
- **Exportação**: Edge Function/RPC `export_my_data()` devolve JSON com todos os registros + URLs assinadas dos anexos (LGPD art. 18, II e V).
- Pgtap em `supabase/tests/` prova isolamento entre famílias (`npm run db:test`).

## 6. Segurança e LGPD (checklist de engenharia)

- [x] Base legal: **consentimento específico e destacado** para dado sensível (art. 11, I), versionado na tabela `consents`; revogável nos Ajustes.
- [x] Minimização: não pedimos CPF, endereço nem telefone no MVP.
- [x] Nada de segredo no código: só `EXPO_PUBLIC_SUPABASE_URL` e a anon key (pública por design; segurança está na RLS). Service role apenas em Edge Functions.
- [x] Tokens de sessão cifrados no aparelho.
- [x] Dados em região brasileira (sa-east-1).
- [x] Sem analytics/crash reporting com dado de saúde; logs não contêm conteúdo de registro.
- [x] Exclusão e exportação de dados pelo próprio titular.
- [ ] (pré-loja) Política de privacidade e termo publicados em URL; preenchimento de "App Privacy" (Apple) e "Data safety" (Google); encarregado (DPO) definido.

## 7. Qualidade

| Comando | O que faz |
|---|---|
| `npm run typecheck` | `tsc --noEmit` estrito |
| `npm run lint` | ESLint (expo + fronteiras FSD/Clean), zero warnings |
| `npm test` | Jest (`jest-expo`) + Testing Library: domínio, adaptadores locais, telas-chave |
| `npm run check` | Os três acima |
| `npm run db:test` | pgTAP de RLS/Storage no Supabase local (exige Docker) |

Pirâmide: casos de uso e regras de domínio (maioria, sem RN) → adaptadores locais → componentes e fluxos de tela críticos.

## 8. Ambientes e build

- `.env` (não versionado) a partir de `.env.example`. Sem variáveis = modo demo (só em dev).
- `eas.json`: perfis `development` (dev client), `preview` (distribuição interna) e `production` (lojas). Variáveis de produção ficam nos *EAS Environment Variables*, nunca no repositório.
- Identificadores: iOS `br.com.prontuariofamilia.app`, Android `br.com.prontuariofamilia.app`, scheme `prontuariofamilia`.
- Publicação nas lojas e repositório remoto: **somente quando o Douglas pedir**.
