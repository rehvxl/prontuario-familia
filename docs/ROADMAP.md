# Prontuário da Família — Roadmap

> Entregas pequenas, cada uma testável e demonstrável. Atualizado pelo Tech Lead a cada entrega.

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

## v0.2 — Backend real e beta fechado

- Projeto Supabase (sa-east-1), provedores Apple/Google configurados, SMTP próprio para o e-mail do código.
- Development build (EAS) e distribuição interna (TestFlight / teste interno do Google Play).
- Política de privacidade e termos publicados; encarregado (DPO) definido.
- Monitoramento de erros sem dado sensível (Sentry com scrubbing) — a decidir.
- Ícone, splash e nome final nas lojas.

## v0.3 — Família compartilhada

- Convidar segundo responsável (link/código), papéis owner/editor, sair da família.
- Histórico de alterações por registro.

## v0.4 — Captura inteligente

- OCR do PDF/foto para sugerir tipo, data, local e profissional.
- Vários documentos de uma vez (lote) e compartilhar para o app a partir do e-mail/WhatsApp (share extension).

## v0.5 — Cuidado contínuo

- Carteira de vacinação estruturada e lembretes.
- Lembrete de retorno/renovação de receita.
- Compartilhamento temporário com profissional de saúde (link expirável com auditoria).

## Lojas (quando o Douglas autorizar)

- App Store: conta Apple Developer, App Privacy, Sign in with Apple configurado, screenshots, revisão.
- Google Play: Play Console, Data safety, teste fechado de 14 dias com testadores (exigência para contas pessoais novas).
