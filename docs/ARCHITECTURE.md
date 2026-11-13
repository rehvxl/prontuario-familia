# Prontuário da Família — Arquitetura

> MVP v0.1 + v0.2 "Saúde da família" · novembro/2026 · dono: Tech Lead Prontuário. Mudou algo estrutural? Atualize este arquivo no mesmo commit.
> Revisado em 11/11/2026 na integração da v0.2 (F7a): pasta `modules/`, entities e features de saúde, `AppContainer` com 11 portas, seed demo e ADR 0001.
> Revisado em 12/11/2026 depois da QA da v0.2 (`docs/qa/v0.2-relatorio.md`): `modules/document-text` validado nos development builds, fontes Archivo via `expo-font`, barra de status do iOS e cor da pessoa por ordem de cadastro (decisões 14–16).

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
| 13 | **Leitura de documentos (OCR) no aparelho** com módulo Expo local `modules/document-text` (Apple Vision + PDFKit no iOS; ML Kit Latin no Android). O texto lido só gera sugestões revisadas pela pessoa e nunca é salvo nem logado. Detalhe: [ADR 0001](adr/0001-ocr-no-aparelho.md), `docs/features/ocr-tecnico.md`. | O documento de saúde não sai do celular; funciona sem rede e sem custo por página. | OCR em nuvem (Google Vision, Textract): o documento sairia do aparelho. Biblioteca de terceiros: sem PDF com camada de texto e com manutenção incerta. |
| 14 | **Fonte Archivo SemiCondensed** (OFL, 4 cortes estáticos `ArchivoSC-Regular…Bold` em `assets/fonts/`) embutida no binário pelo **config plugin do `expo-font`** no `app.json`. `ThemeProvider` chama `useFonts` (no build responde "carregada" na hora; no Expo Go carrega em tempo de execução). `fontFamilyFor(peso)` em `shared/ui/tokens/typography.ts` escolhe o arquivo, porque cada peso é uma família. Sem a fonte, o texto usa a do sistema. Parte do DS v4 "Pasta com divisórias" (11/11/2026). | Fonte disponível desde o primeiro quadro no development build, sem esperar download, e com o mesmo nome no iOS (PostScript) e no Android (arquivo). | Só `useFonts` em tempo de execução (texto pisca com a fonte do sistema). Serifa New York do DS v3, rejeitado pelo Douglas. |
| 15 | **`UIViewControllerBasedStatusBarAppearance: false`** em `ios.infoPlist` no `app.json` | Com o valor padrão, a barra de status do iOS ficava escura sobre o fundo ultramar. Com `false`, o estilo global do app (`expo-status-bar`) vale em todas as telas, em vez de cada view controller decidir. Achado na QA da v0.2 (12/11/2026). | Manter o padrão do iOS (barra escura sobre o ultramar). |
| 16 | **Cor da pessoa pela ordem de cadastro**: `registerPersonHues(ids)` (`shared/ui/lib/identity.ts`) recebe os ids ordenados por `createdAt`, chamado por `usePersonHues()` em `src/app/(main)/_layout.tsx` antes de qualquer tela pintar uma pessoa. A 1ª pessoa recebe o matiz 0, a 2ª o 1… (7 matizes; da 8ª em diante repetem). `categoricalIndexFor(id)` lê esse registro e cai no hash FNV-1a só para id não registrado. | O hash do id repetia cores dentro da mesma família; a ordem de cadastro não repete até 7 pessoas e dá a mesma cor em qualquer aparelho. Achado na QA da v0.2. | Hash do id (repetia). Persistir o matiz no cadastro (fica para quando excluir pessoa deslocar cores incomodar). Limite conhecido: registro em módulo, não em contexto; excluir uma pessoa desloca as cores de quem veio depois. |

## 2. Camadas (FSD) e segmentos (Clean)

```
modules/
└── document-text/  # Módulo Expo LOCAL (autolinking, sem config plugin): OCR no aparelho (ADR 0001).
    ├── src/DocumentTextModule.ts   # tipos + requireOptionalNativeModule('DocumentText'): null no Expo Go, web e Jest
    ├── ios/        # Swift: Vision (imagem) + PDFKit (camada de texto do PDF, OCR por página quando falta)
    └── android/    # Kotlin: ML Kit Text Recognition Latin (dependência Gradle aqui, não no package.json)
                    # Validado em 12/11/2026 nos development builds (iOS 26.5 e Android 16), com laudo fictício.
src/
├── app/            # ROTAS do expo-router (finas: só re-exportam telas de src/screens). Camada "routes".
├── application/    # Camada "app" do FSD: providers, composição/DI (container), seed demo, query client.
├── screens/        # Camada "pages" do FSD: uma tela por slice (login, timeline, record-detail...).
├── widgets/        # Blocos de tela compostos (attachment-picker, member-form, floating-actions...).
├── features/       # Ações do usuário com regra de negócio (auth, create-family, add-record, search...).
├── entities/       # Conceitos do negócio: session, family, member, health-record, consent,
│                   #   measurement, vaccine, medication (v0.2).
└── shared/         # Sem negócio: ui (design system), lib, config, api (cliente Supabase).
```

Slices da v0.2 (spec `docs/features/v0.2-saude-da-familia.md`, contratos em `docs/features/v0.2-plano-implementacao.md` §3):

| Slice | O que tem |
|---|---|
| `entities/measurement` | Exames (`kind: 'lab'`) e sinais vitais (`'vital'`): catálogo de analitos, `computeFlag` (R1), séries e tendência (R2–R4, R15), adaptadores local e Supabase |
| `entities/vaccine` | Doses, dispensas ("Não se aplica"), calendário PNI 2026 (`VACCINE_SCHEDULE`) e avaliação R7–R14 (`evaluateVaccines`) |
| `entities/medication` | Medicamentos, duração (R6) e status (R5) |
| `features/read-document` | Porta `DocumentTextExtractor`, `readDocument` (5 arquivos, 5 páginas e 20 s no total), parser de sugestões e leitores nativo, demo e indisponível. O parser corrige trocas típicas no denominador da unidade (o Vision lê "mg/dL" como "mg/aL"; teste com a saída real) e preserva a precisão pelas casas decimais do analito ("1,0") |
| `features/add-measurement`, `record-vaccine-dose`, `manage-medication` | Validação de formulário e mutações (o `ui/` é das telas) |
| `features/health-overview` | Resumo da pessoa e painel "Para acompanhar" da família |
| `features/add-record` (estendida) | `healthData` opcional: grava os itens revisados com `sourceRecordId` e origem `ocr`, com compensação se algo falha |

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
export async function addRecord(
  deps: { records; storage; measurements; vaccineDoses; medications },
  input: AddRecordInput, // healthData? (v0.2): itens lidos do documento e revisados
): Promise<HealthRecord> { /* valida, cria, envia anexos, grava os itens ligados */ }
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
- **`no-console: error`** em `src/features/read-document/**` e `modules/document-text/src/**`: o texto lido é dado de saúde (spec F1.15). `privacy.test.ts` confere o mesmo no código do slice.
- `modules/` entra no lint (`eslint .`) e no typecheck (`tsconfig` inclui `**/*.ts`). Não é camada FSD: só `features/read-document/data` importa o módulo, por caminho relativo.
- Configuração: `eslint.config.js`. Violação = erro de lint = CI vermelho.

## 3. Composição (injeção de dependências)

`src/application/container.ts` monta um objeto `AppContainer` com as implementações das portas:

```ts
interface AppPorts {
  auth: AuthGateway; families: FamilyRepository; members: MemberRepository;
  records: HealthRecordRepository; storage: AttachmentStorage; consents: ConsentRepository;
  dataExport: DataExportGateway;
  measurements: MeasurementRepository; vaccineDoses: VaccineDoseRepository; medications: MedicationRepository; // v0.2
  documentText: DocumentTextExtractor; // v0.2: não depende do backend
}
type BackendPorts = Omit<AppPorts, 'documentText'>; // o que createLocalPorts / createSupabasePorts devolvem
interface AppContainer extends AppPorts { mode: 'supabase' | 'demo' }
```

`containerDependencies(container)` registra cada porta na chave de `DEPENDENCY_KEYS` (`@/shared/lib`); os hooks `use*Repository()` das entities resolvem por ela. Um teste garante que toda chave tem porta.

- Com `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` → adaptadores `supabase-*` de cada entity (`application/supabase-ports.ts`, um cliente para todos).
- Sem elas e com `__DEV__` (ou `EXPO_PUBLIC_DEMO_MODE=1`) → adaptadores `local-*` (AsyncStorage + `expo-file-system`). Código OTP de demonstração: **123456**. Um selo "Modo demonstração" aparece no app.
- Build de produção sem as variáveis → erro de configuração na abertura (nunca cai em demo silenciosamente).

O container é entregue por `ContainerProvider` (React Context); hooks em `model/` usam `useContainer()` e chamam os casos de uso. Testes trocam o container por fakes em memória.

**Leitor de documentos** (`documentText`, `ocr-tecnico.md` §b.4). A escolha é feita depois das portas e não depende do backend:

| Binário | Modo | Leitor |
|---|---|---|
| Com o módulo nativo (development, preview, production build) | demo ou Supabase | **nativo** (`availability: 'device'`). No demo também, senão o OCR real nunca seria testado no dev build |
| Sem o módulo (Expo Go, web) | demo | **demo**: texto fictício pelo nome do arquivo; a tela mostra a A8 |
| Sem o módulo | Supabase | **indisponível**: a leitura não começa (A9) e o preenchimento manual segue igual |

`overrides.documentText` troca o leitor nos testes de tela.

**Família de exemplo (modo demo, Q10/L1).** `application/demo-seed.ts`: `loadDemoFamily(ports, now?)` grava a "Família Souza" pelas próprias portas (os adaptadores locais validam a integridade): Ana (Eu, 38 anos), Carlos (cônjuge, 67, hipertenso e diabético, 4 HbA1c em 2 anos, glicemias, pressão), Lia (filha, 10 meses, ferritina baixa, vacinas da infância com a febre amarela atrasada) e Dirce (mãe, 78, influenza do ano pendente), com documentos e os itens ligados a eles. Datas relativas a hoje. Usa a família existente (ou cria uma), não apaga nada, não duplica Ana se já há "Eu" e é idempotente. **Decisão:** exposto como hook de `application`, `useLoadDemoFamily()` (mutação que invalida todo o cache), e não como porta do container: só a rota pode importar `application`, então `src/app/(main)/(tabs)/(settings)/index.tsx` chama o hook e passa a mutação à `SettingsScreen` só quando `mode === 'demo'`, como já faz com `useRevokeConsentFlow`. Fora do demo, o hook rejeita sem gravar.

## 4. Navegação (expo-router)

```
src/app/                          # rotas finas: só reexportam telas de src/screens
├── _layout.tsx                   # Providers + SessionGate (Stack.Protected + Redirect por resolveNextStep)
├── (onboarding)/welcome.tsx      # Boas-vindas (3 passos)
├── (onboarding)/consent.tsx      # Aceite LGPD (duas caixas obrigatórias)
├── (auth)/sign-in.tsx            # E-mail / Apple / Google
├── (auth)/verify.tsx             # Código de 6 dígitos
├── auth/callback.tsx             # Retorno do OAuth (deep link)
├── (setup)/family.tsx · members.tsx
└── (main)/_layout.tsx            # Stack principal
    ├── (tabs)/_layout.tsx        # NativeTabs (Liquid Glass no iOS 26, Material 3 no Android)
    │   ├── (family)/index.tsx    # Família: pessoas
    │   ├── (search)/index.tsx    # Busca global (Stack.SearchBar)
    │   └── (settings)/index.tsx  # Ajustes: exportar, revogar consentimento, excluir conta; no demo, "Carregar família de exemplo"
    ├── member/new.tsx            # modal (ver limitação abaixo)
    ├── member/[id]/index.tsx     # Linha do tempo + filtro por tipo
    ├── member/[id]/edit.tsx
    ├── record/new.tsx            # modal, com anexos (câmera, galeria, arquivo)
    └── record/[id].tsx           # Detalhe + visualizador + menu "…" (excluir)
```

Guarda (`SessionGate`): sem consentimento → onboarding; sem sessão → auth; sem família → setup; senão → main.

**Consentimento antes do login.** A tabela `consents` exige usuário, mas o aceite acontece antes do login. O aceite fica num store persistido do aparelho (`application/session/device-consent`, só a versão) e é gravado no repositório logo depois do login. `useConsentFlow` lê a sessão **no momento do aceite** (`auth.getCurrentUser()`), não um valor capturado no render. Isso corrigiu um teste intermitente (corrida de estado). Depois de `deleteAccount`, o aceite do aparelho é limpo.

**Exclusão de registro.** O caso de uso `deleteRecord` (`features/delete-record`) usa `HealthRecordRepository.remove`; o adaptador apaga os arquivos do Storage antes do banco, então uma falha no Storage não deixa registro órfão e pode ser repetida. Edição de registro e remoção de anexo individual ficam para depois do MVP.

**Limitações conhecidas (MVP).**
- `formSheet` nativo com o corpo em branco no Expo Go do iOS 26.5. A causa provável é uma raiz não achatável (fundo opaco ou `testID`); `Screen presentation="sheet"` já trata isso (`DESIGN_SYSTEM.md` §9.1–9.2). Até a validação no simulador, `record/new` e `member/new` usam `presentation: 'modal'`.
- `Stack.Title` do expo-router apaga as cores do título: use `ScreenTitle`/`LargeTitle` de `@/shared/ui/navigation`.
- Botão Sign in with Apple em pt-BR (`CFBundleDevelopmentRegion`) só é verificável num development build.
- Android, só em desenvolvimento: mudar a fonte do sistema com o app aberto recria a Activity, e o LogBox mostra "configured linking in multiple places".
- `metro.config.js` desliga o Watchman (`useWatchman = false`) porque o Watchman local está quebrado; `brew reinstall watchman` resolve.

## 5. Modelo de dados (Supabase / Postgres)

```
auth.users ─1:1─ profiles
families ─1:n─ family_memberships ─n:1─ auth.users      (role: owner | editor)
families ─1:n─ members ─1:n─ health_records ─1:n─ attachments
auth.users ─1:n─ consents                               (purpose, version, accepted_at, revoked_at)
members ─1:n─ measurements · vaccine_doses · vaccine_rule_dismissals · medications   (v0.2)
health_records ─1:n─ measurements · vaccine_doses · medications   (source_record_id, on delete cascade)
```

- v0.2 (migração `20261111000004_health_data.sql`, `docs/features/dados-saude-backend.md`): FK composta `(source_record_id, member_id, family_id)` → `health_records`, para o item lido ser sempre da mesma pessoa do documento; apagar o documento apaga o que foi lido dele (A15). Os adaptadores locais imitam as mesmas restrições e cascatas. Termo `2026-11-v2`: o aceite da v1 deixa de valer e o app pede novo aceite. Termo não versionado; adendo da ficha aprovado por Douglas em 2026-11-13: o texto da ficha de emergência integra o mesmo `2026-11-v2`, sem reaceite.

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

- `.env` (não versionado) a partir de `.env.example`. Sem variáveis = modo demo (só em dev). Em produção, faltar URL ou anon key do Supabase faz o app falhar ao iniciar (`resolveEnv`), a menos que `EXPO_PUBLIC_DEMO_MODE=1`. **O perfil `production` do EAS nunca define `EXPO_PUBLIC_DEMO_MODE=1`.**
- `eas.json`: perfis `development` (dev client), `preview` (distribuição interna) e `production` (lojas). Variáveis de produção ficam nos *EAS Environment Variables*, nunca no repositório.
- Identificadores: iOS `br.com.prontuariofamilia.app`, Android `br.com.prontuariofamilia.app`, scheme `prontuariofamilia`.
- Publicação nas lojas e repositório remoto: **somente quando o Douglas pedir**.
