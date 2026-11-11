# Prontidão para as lojas — Prontuário da Família

> v0.1.5 · QA Prontuário · 11/11/2026 · Baseado em leitura de `app.json`, `eas.json`, `supabase/` e `src/` (árvore de trabalho com o reskin ainda não commitado). **Nada foi enviado às lojas.**
> Legenda: ✅ ok · ⚠️ parcial / precisa verificar · ❌ falta · 👤 depende do Douglas

## 0. Verificações automáticas (saída real na resposta do QA)
| Verificação | Resultado |
|---|---|
| `npm run db:start` / `db:reset` | ✅ stack local sobe; 3 migrations aplicadas; bucket `health-files` atualizado |
| `npm run db:test` | ✅ 3 arquivos, 118 testes, PASS |
| `npm run typecheck` | ✅ sem erros |
| `npm run lint` (`--max-warnings=0`) | ✅ sem avisos |
| `npm test` | ✅ 51 suítes, 350 testes. Aviso não bloqueante: `fireEvent("layout") does not bubble` (type-select-frame) |
| Busca por segredos (arquivos versionados) | ✅ nenhuma chave real. Só aparecem a palavra `service_role` em migrations/comentários. `.env`, `supabase/.env` ignorados; só `.env.example` versionado, com valores vazios |
| Bucket `health-files` | ✅ `public = false`, 20 MiB, MIMEs: pdf/jpeg/png/heic/heif/webp |
| URLs assinadas | ✅ 300 s no visualizador, 3600 s na exportação (código). Expiração real só validável na Fase B |

Nota: a saída dos comandos de saída local do Supabase mostra chaves de demonstração públicas do CLI; não são segredos.

## 1. Configuração do projeto (`app.json`, `eas.json`)
| Item | Status | Observação |
|---|---|---|
| Bundle ID iOS / package Android | ✅ | `br.com.prontuariofamilia.app` em ambos. 👤 confirmar que o domínio/identificador é o definitivo (não muda depois de publicar) |
| Versão | ⚠️ | `version 0.1.0`. `eas.json`: `appVersionSource: remote` + `autoIncrement` (buildNumber/versionCode no EAS). Definir versão da 1ª submissão (ex.: 1.0.0) |
| `usesNonExemptEncryption: false` | ✅ | Só HTTPS padrão; confirmar com o Tech Lead |
| Ícone 1024×1024 | ✅ | `assets/icon.png` 1024×1024 RGB (sem alfa, exigência da Apple). Falta revisão visual do Designer/Douglas: pode ser o ícone padrão do template |
| Ícone adaptativo Android | ✅/⚠️ | foreground/background 512, monochrome 432. Conferir com a máscara do Android e `backgroundColor #E6F4FE` |
| **Splash** | ⚠️ | `app.json` **não** tem plugin/config de splash; `assets/splash-icon.png` existe mas não é referenciado, e `expo-splash-screen` não está em `package.json`. Provável splash padrão. Confirmar em build; ❌ se o nome/marca final for exigido |
| Nome na loja | ⚠️ | `Prontuário da Família` (com acento) ok; checar disponibilidade e limite (30 caracteres) 👤 |
| Localização | ✅ | `CFBundleDevelopmentRegion pt-BR` |
| `eas.json` perfis | ✅ | development (simulador), preview (interno), production |
| `eas.json` submit | ❌ | `submit.production` vazio: faltam `ascAppId`/chave da API da App Store e conta de serviço do Play 👤 |
| `eas.json` variáveis de produção | ❌ | Sem `EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY` por perfil. Sem projeto Supabase real ainda (BACKEND.md §9) 👤 |
| `EXPO_PUBLIC_DEMO_MODE` em produção | ⚠️ | Garantir `0` no perfil production: o modo demo aceita código `123456` (**risco de segurança se vazar para produção**). Verificar que sem URL/anon key o build de produção NÃO cai silenciosamente no demo |
| Orientação | ✅ | `portrait`; `supportsTablet: false` |
| Android `predictiveBackGestureEnabled` | ✅ | `false` |
| `targetSdkVersion` | ⚠️ | Não fixado; vem do padrão do Expo SDK 58. Verificar no `prebuild`/build (Play exige o nível vigente; conferir a exigência de 2026). Não executei prebuild (regra: não instalar/gerar nativo) |
| Dependências nativas | ⚠️ | `expo-doctor` e `npx expo install --check` não rodados nesta fase |

## 2. App Store (iOS)
| Requisito | Status | Detalhe |
|---|---|---|
| **Sign in with Apple** (guideline 4.8) | ⚠️ | Código pronto (`expo-apple-authentication`, `usesAppleSignIn: true`, nonce). Como há login de terceiros opcional (Google) e e-mail OTP, Apple só é exigida se Google ficar ativo; recomendado manter. Falta: 👤 capability no Apple Developer, Services ID/chave `.p8`, secret no Supabase (expira em 6 meses). Não testável no simulador sem conta |
| **Exclusão de conta no app** (5.1.1(v)) | ✅ | Ajustes → Excluir conta, dupla confirmação; Edge Function `delete-account` apaga tudo. Validar ponta a ponta na Fase B (SET-05..07) |
| **Textos de permissão pt-BR** | ✅ | Fotos e Câmera em pt-BR e específicos; microfone desativado. Falta `NSPhotoLibraryAddUsageDescription` só se o app salvar na galeria (não salva) |
| **Privacy Nutrition Labels** (App Privacy) | ❌ 👤 | A preencher no App Store Connect. Proposta abaixo (§5) |
| **Privacy manifest** (`PrivacyInfo.xcprivacy`) | ⚠️ | `app.json` não declara `ios.privacyManifests`. Bibliotecas do Expo trazem os seus; o app usa AsyncStorage/FileSystem (APIs de "required reason": UserDefaults, timestamps de arquivo). Verificar no build gerado (EAS) e declarar o que faltar |
| **Política de privacidade (URL)** | ❌ 👤 | Obrigatória no App Store Connect e dentro do app. Não existe URL nem tela |
| **App de saúde** (1.4.1 / 5.1.3) | ⚠️ | Não dá diagnóstico nem orientação médica: manter texto "organiza documentos; não substitui orientação médica". Descrever claramente na ficha. Dados de saúde não podem ir para publicidade/analytics (não há) |
| Conta de revisão | ❌ 👤 | O revisor precisa entrar: fornecer e-mail de teste com código fixo (OTP real não serve ao revisor). Sugestão: usuário de teste no Supabase com OTP de teste fixo ou notas de revisão explicando o modo demo |
| Screenshots 6,9" e descrição pt-BR | ❌ 👤 | Capturar após o reskin (Fase B pode gerar) |
| Classificação etária / categoria (Saúde e fitness) | ❌ 👤 | Questionário no App Store Connect |
| Faixa etária e dados de crianças | ⚠️ | O app guarda dados de saúde de menores, mas o usuário é adulto responsável. Declarar no questionário |

## 3. Google Play
| Requisito | Status | Detalhe |
|---|---|---|
| **Data safety** | ❌ 👤 | A preencher no Play Console (proposta §5) |
| **Exclusão de conta** | ⚠️ | No app: ✅. **Por link web (exigido pelo Play): ❌**. Precisa de página pública que explique/dispare a exclusão (ou formulário que chame a mesma função) 👤 |
| Política de privacidade (URL) | ❌ 👤 | Mesmo item da App Store |
| `targetSdk` | ⚠️ | Ver §1 |
| Permissões Android | ⚠️ | `app.json` não lista permissões; o Expo as injeta por plugin (`expo-image-picker` → CAMERA e leitura de mídia). Conferir o `AndroidManifest` gerado e bloquear o que não for usado (`blockedPermissions`), em especial `RECORD_AUDIO`/gravação |
| Declaração "app de saúde" (Health apps declaration) | ❌ 👤 | Formulário próprio do Play para apps de saúde |
| Teste fechado de 14 dias, mín. 12 testadores (conta pessoal nova) | ❌ 👤 | Previsto no ROADMAP; planejar com antecedência |
| Assinatura / App Bundle | ✅/⚠️ | EAS gera AAB e gerencia a chave; Play App Signing |
| Android: login Google | ⚠️ | Só com `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=1` e provedor configurado 👤 |
| Verificação no Android | ❌ | Não executada (sem emulador verificado nesta fase) |

## 4. LGPD — art. 11 (dados sensíveis de saúde)
| Requisito | Status | Detalhe |
|---|---|---|
| Consentimento explícito, destacado e específico | ✅ | Duas caixas separadas (termos/privacidade e tratamento de dado de saúde); versionado; histórico preservado; um ativo por finalidade (pgTAP) |
| Textos dos Termos e da Política | ❌ 👤 | A tela cita "Termos de Uso e Política de Privacidade" mas **sem link nem texto**. Precisa publicar e linkar. Finalidade, bases legais, compartilhamento (Supabase como operador), retenção, direitos |
| Revogar consentimento | ✅ | Ajustes; bloqueia acesso até novo aceite (validar na Fase B, SET-03) |
| Acesso / portabilidade (art. 18) | ✅ | Exportar JSON via Edge Function, com URLs de anexo de 1 h e registro em auditoria |
| Eliminação (art. 18, VI) | ✅ | `delete-account` (Storage → banco → usuário). Cobertura por pgTAP é de isolamento, **a função em si só será testada ponta a ponta na Fase B** |
| Minimização / segurança | ✅ | RLS em todas as tabelas, `anon` sem grants, bucket privado, sem conteúdo de saúde em auditoria/logs, sessão em SecureStore |
| Residência / transferência internacional | ⚠️ 👤 | Projeto Supabase planejado em `sa-east-1`. Se não for, declarar transferência internacional na política |
| **Encarregado (DPO)** | ❌ 👤 | Definir e publicar nome e contato na política |
| RIPD (relatório de impacto) | ❌ 👤 | Recomendado para dado sensível em larga escala |
| Plano de incidente (ANPD, art. 48) | ❌ 👤 | Documentar |
| Retenção de backups após exclusão | ⚠️ | Backups do Supabase mantêm cópia por um período; informar na política |
| Menores | ⚠️ | Dados de crianças tratados pelo responsável legal: cobrir na política (art. 14) |

## 5. Rascunho das declarações de privacidade (para o Douglas revisar)
Coletado e **vinculado à identidade**, **sem rastreamento**, **sem publicidade**:
| Dado | Finalidade | Observação |
|---|---|---|
| E-mail, nome (opcional via Apple) | Funcionalidade do app / conta | Obrigatório |
| Dados de saúde (registros, notas, anexos) | Funcionalidade do app | Sensível; criptografado em trânsito; armazenamento Supabase |
| Fotos/arquivos enviados pelo usuário | Funcionalidade do app | Só o que o usuário escolhe |
| ID de usuário | Funcionalidade, segurança | |
| Diagnóstico/analytics/localização/contatos | **Não coletados** | Sem Sentry/analytics hoje (ROADMAP: decidir) |
Data safety do Play: dados criptografados em trânsito ✅; usuário pode pedir exclusão ✅ (informar URL); sem compartilhamento com terceiros (Supabase = operador/prestador).

## 6. Pendências em ordem de impacto
1. 👤 Política de privacidade + Termos publicados, linkados no app e nas lojas; DPO definido.
2. 👤 Página web de exclusão de conta (Play) com URL.
3. 👤 Contas Apple Developer/Play Console, Supabase real (sa-east-1), segredos Apple/Google, variáveis por perfil no `eas.json`, submit.
4. Dev/Tech Lead: garantir que produção nunca use modo demo/OTP `123456`; splash configurado; privacy manifest e permissões Android conferidos no build; `targetSdk`.
5. Fase B: validar exclusão de conta, exportação, revogação e URL assinada ponta a ponta; capturas para as lojas.
