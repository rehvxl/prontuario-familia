# Prontuário da Família — Roadmap

> Entregas pequenas, cada uma testável e demonstrável. Atualizado pelo Tech Lead a cada entrega. Escopo e prioridade: Head de Produto clínico (`docs/team/HEAD_DE_PRODUTO.md`), desde 11/11/2026.
>
> **Renumeração em 11/11/2026.** A pedido do Douglas, a nova versão "Saúde da família" entrou como v0.2. As versões seguintes andaram uma posição, sem perder conteúdo: Backend real v0.2 → v0.3; Família compartilhada v0.3 → v0.4; Captura inteligente v0.4 → v0.5 (o OCR foi antecipado para a v0.2); Cuidado contínuo v0.5 → v0.6 (a carteira de vacinação estruturada foi antecipada para a v0.2).

## v0.1 — MVP local (em andamento · nov/2026)

| # | Entrega | Responsável | Status |
|---|---|---|---|
| 0.1.0 | Fundação: Expo SDK 58 + expo-router, TS estrito, lint de fronteiras FSD/Clean, Jest, contratos de domínio, docs | Tech Lead | ✅ |
| 0.1.1 | Design system (Impeccable): tokens, tema claro/escuro, componentes base em `src/shared/ui`, `docs/DESIGN_SYSTEM.md` | Designer | ✅ |
| 0.1.2 | Supabase: migrações, RLS, bucket privado, pgTAP, adaptadores `supabase-*`, `.env.example`, `docs/BACKEND.md` | Backend | ✅ (118 testes pgTAP) |
| 0.1.3 | Casos de uso + adaptadores locais (modo demo) + container/DI + testes | Mobile | ✅ |
| 0.1.4 | Telas: onboarding/consentimento, login OTP (Apple/Google preparados), família e membros, novo registro com anexo, linha do tempo com filtro, busca, detalhe com visualizador, ajustes (exportar/excluir) | Mobile | ✅ (336 testes; roteiro no iOS 26.5) |
| 0.1.6 | Design System v2 nativo: Liquid Glass no iOS 26 e Material 3 no Android (@expo/ui, expo-glass-effect, expo-symbols, NativeTabs), seguido do reskin das telas. Pedido do Douglas em 11/11. | Designer ✅ → Mobile (reskin, 0.1.7) ✅ (`5755d07`) |
| 0.1.5 | QA: checks, testes de fluxo, roteiro manual no simulador iOS/Android, checklist de loja | QA | ✅ Fase A e B no iOS 26.5 (26 casos passaram, 4 falharam; `docs/qa/BUGS.md`). Android não testado |
| 0.1.8 | Correções da QA: menu "…" da pessoa (BUG-01), acessibilidade (voltar, seletores), contraste no escuro, AX5, revogar → consentimento, splash screen, formSheet validado | Mobile + Designer → regressão QA | 🔄 |

## v0.2 — Saúde da família (em QA · nov/2026)

Origem: pedido do Douglas em 11/11/2026: redesenho (primeiro "Cuidado sereno", trocado por "Pasta com divisórias" no mesmo dia, ver abaixo), OCR no aparelho, acompanhamento de saúde individual e coletivo, persona líder. Spec: `docs/features/v0.2-saude-da-familia.md`. Calendário: `docs/features/calendario-vacinal-pni.md`. Desenho técnico: `docs/features/ocr-tecnico.md`, `docs/features/dados-saude-backend.md`, ADR 0001. Plano para agentes paralelos (posse de arquivos e contratos): `docs/features/v0.2-plano-implementacao.md`. Começa depois do commit da 0.1.8. Relatório de QA: `docs/qa/v0.2-relatorio.md` (12/11/2026); capturas finais em `docs/screenshots/v4/`.

> **Troca de direção visual em 11/11/2026.** O Douglas achou o "Cuidado sereno" (serifa, sálvia e papel creme) parecido com outras entregas de IA. Numa rodada do Impeccable ele escolheu a direção **"Pasta com divisórias"**, que virou o `DESIGN_SYSTEM.md` v4. A especificação v3 fica só como histórico em `docs/design-proposals/v3-cuidado-sereno`.

| # | Entrega | Responsável | Status |
|---|---|---|---|
| 0.2.0 | Persona Head de Produto, spec da rodada, calendário PNI 2026, PRODUCT e ROADMAP | Head de Produto | ✅ (docs, sem commit) |
| 0.2.1 | Design ~~"Cuidado sereno" (v3)~~ → **"Pasta com divisórias" (v4)**, trocado em 11/11/2026 (ver nota acima): divisória por pessoa, régua de abas, fonte Archivo, números tabulares, cartão de resumo, estados de saúde, gráfico; `DESIGN_SYSTEM.md` v4 | Designer | ✅ sem commit: código em `src/shared/ui`; capturas claro/escuro/maior fonte no iOS e Android (`docs/screenshots/v4`); revisão final do Impeccable com Verdict Pass (item GROUND corrigido, em nova pontuação) |
| 0.2.2 | Domínio: `measurement`, `vaccine`, `medication`, catálogos, regras R1–R15 com testes de limite, adaptadores locais, seed demo, termo v2 | Mobile | ✅ sem commit (F0, F2a–c; container e seed `application/demo-seed.ts` na F7a; 843 testes Jest no projeto em 11/11; 1409 em 12/11) |
| 0.2.3 | Banco: tabelas novas, RLS, pgTAP, adaptadores `supabase-*`, exportação e cascatas | Backend | 🔄 migração, pgTAP e exportação `format_version: 2` entregues (F3); adaptadores `supabase-*` ligados em `supabase-ports.ts` (F7a). pgTAP local verde na Fase B1 (`04_health_data` e `02` 68/68); `npm run db:test` não reexecutado na integração; Supabase real não testado |
| 0.2.4 | F5 Sinais vitais manuais | Mobile | ✅ sem commit (roteiro iOS e Android, 12/11) |
| 0.2.5 | F2 Exames com tendência | Mobile | ✅ sem commit (série da HbA1c com a faixa do laudo, iOS e Android) |
| 0.2.6 | F4 Medicamentos em uso | Mobile | ✅ sem commit (roteiro iOS e Android) |
| 0.2.7 | F3 Vacinas e pendências (calendário PNI) | Mobile | ✅ sem commit: testes Jest verdes (corrida da "Nova dose" corrigida); carteira conferida no iOS 26.5 em 12/11 (Android não capturado) |
| 0.2.8 | F6 Resumo de saúde da pessoa | Mobile | ✅ sem commit (roteiro iOS e Android) |
| 0.2.9 | F7 Painel da família | Mobile | ✅ sem commit ("Para acompanhar", pessoas e régua de abas no iOS e Android) |
| 0.2.10 | F1a Extração + tela de revisão + leitor demo (Expo Go) | Mobile | ✅ sem commit: revisão → salvar 3 itens → itens no Resumo do Carlos (iOS); parser corrige "mg/aL" lido pelo Vision |
| 0.2.11 | F1b Módulo `modules/document-text` iOS (Vision + PDFKit), development build | Mobile + Tech Lead | ✅ sem commit: development build no simulador iPhone 17 Pro (iOS 26.5) leu o laudo fictício inteiro |
| 0.2.12 | F1c Módulo Android (ML Kit) | Mobile | ✅ sem commit: APK debug no emulador Android 16 (API 36) leu o laudo (tipo Resultado, 4 exames) |
| 0.2.13 | QA: roteiro, acessibilidade, privacidade (proxy), regressão do MVP | QA | 🔄 `docs/qa/v0.2-relatorio.md`: `npm run check` verde (1409 testes), roteiro e OCR nos dois sistemas, 11 defeitos corrigidos. Não executados: VoiceOver/TalkBack reais, proxy de rede, Supabase real, aparelho físico, build EAS; `expo-doctor` 19/20 (patch do `expo`) |

## v0.3 — Backend real e beta fechado (era v0.2)

- Projeto Supabase (sa-east-1), provedores Apple/Google configurados, SMTP próprio para o e-mail do código.
- Development build (EAS) e distribuição interna (TestFlight / teste interno do Google Play).
- Política de privacidade e termos publicados; encarregado (DPO) definido.
- Monitoramento de erros sem dado sensível (Sentry com scrubbing) — a decidir.
- Ícone, splash e nome final nas lojas.

## v0.4 — Família compartilhada (era v0.3)

- Convidar segundo responsável (link/código), papéis owner/editor, sair da família.
- Histórico de alterações por registro.

## v0.5 — Captura inteligente (era v0.4)

- ~~OCR do PDF/foto para sugerir tipo, data, local e profissional.~~ Antecipado para a v0.2 (F1) em 11/11/2026.
- Vários documentos de uma vez (lote) e compartilhar para o app a partir do e-mail/WhatsApp (share extension).

## v0.6 — Cuidado contínuo (era v0.5)

- Carteira de vacinação estruturada e lembretes. A carteira e as pendências foram antecipadas para a v0.2 (F3) em 11/11/2026; os lembretes ficam aqui.
- Lembrete de retorno/renovação de receita.
- Compartilhamento temporário com profissional de saúde (link expirável com auditoria).

## Lojas (quando o Douglas autorizar)

- App Store: conta Apple Developer, App Privacy, Sign in with Apple configurado, screenshots, revisão.
- Google Play: Play Console, Data safety, teste fechado de 14 dias com testadores (exigência para contas pessoais novas).
