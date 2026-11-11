# Bugs — v0.1.5, Fase B

Rodada de 2026-11-11 no iPhone 17 Pro (iOS 26.5, simulador), Expo Go, modo demo, claro e escuro. Base: commit `5755d07` (reskin).
> **Base testada:** HEAD `5755d07` + edições do Design System ainda não commitadas (`ListItem.tsx`, `Screen.tsx`, `ScreenTitle.tsx`, `ui/index.ts`), já que o Metro serve a árvore de trabalho. Bugs que podem vir desses arquivos: **pode mudar com a correção do DS em andamento** — BUG-01 (menu "…" na `ListItem`), BUG-03, BUG-08 e BUG-11.
> **Regressão pendente (a pedido do Tech Lead, após o commit do Designer):** "…" das pessoas com VoiceOver, cor do título grande, deslocamento do conteúdo ao voltar o foco, typecheck, lint e test.

Severidade: **bloqueia** (impede release ou o fluxo principal) · **alta** · **média** · **baixa**.
Capturas em `docs/qa/screenshots/`. Nenhum código do app foi alterado nesta fase.

| ID | Sev. | Resumo | Status |
|---|---|---|---|
| BUG-01 | alta | Menu "…" de cada pessoa na home não abre; "Editar pessoa" fica sem acesso | confirmado no Expo Go; development build não executado (fora do escopo) |
| BUG-02 | info (resolvido) | Sondas `__probe*.tsx` e mudanças em `_layout.tsx`/`Screen.tsx` são do Designer (TEMP-DESIGNER-REPRO, trabalho em andamento); quebram typecheck e lint até a limpeza | não é bug do app |
| BUG-03 | média | Botão voltar se chama "(tabs)" para o VoiceOver | confirmado na árvore de acessibilidade |
| BUG-04 | média | Seletores "Parentesco" e "Sexo" sem nome acessível | confirmado na árvore de acessibilidade |
| BUG-05 | média | Texto branco sobre o azul-claro do botão "Novo registro" no escuro tem contraste baixo | a medir |
| BUG-06 | média | Telas anteriores continuam na árvore de acessibilidade (onboarding → consentimento, login → código) | a confirmar com VoiceOver |
| BUG-07 | média | Abas "Família" e "Ajustes" e o botão de busca não aparecem na árvore de acessibilidade | a confirmar com VoiceOver (pode ser limite do simulador) |
| BUG-08 | baixa | "Novo registro" estoura a borda esquerda com Dynamic Type AX5 | confirmado |
| BUG-09 | baixa | Revogar consentimento leva ao onboarding (1 de 3), não ao consentimento | confirmado |
| BUG-10 | baixa | O "…" do detalhe do registro aparece 2–3 s depois do resto | visto uma vez (`bug-detalhe-sem-menu.png`) |
| BUG-11 | baixa | "Excluir conta" fica parcialmente sob a barra de abas ao abrir Ajustes | visto; não rolei para confirmar |

## BUG-01 — Menu "…" da home não abre (alta)
Passos:
1. Home com pessoas. 2. Tocar no "…" da linha "Bia Souza" (toque real, em primeiro plano).

Resultado: abre a linha do tempo da pessoa; o menu ("Novo registro", "Editar pessoa") não aparece.
Esperado: abre o menu (`FamilyHomeScreen.tsx:55-62`).
Evidência: `a11y-home-sem-menu-pessoa.png`. A árvore de acessibilidade da home só tem "Ana Souza, Eu · 1 registro" e "Bia Souza, …". Não existe nenhum "Mais ações para …", então o VoiceOver também não alcança. Isso confirma a suspeita do Mobile.
Impacto: `member/[id]/edit` só é referenciada neste menu e em `_layout.tsx`. Sem o menu, não dá para editar nem excluir pessoa pela UI (FAM-05 e FAM-06 bloqueados).
Observação: o menu nativo do detalhe do registro (`Stack.Toolbar.Menu`) funciona. O problema é o `Menu` de `@expo/ui/community/menu` dentro da linha. Falta saber se é limite do Expo Go ou defeito do app (testar em development build).

## BUG-02 — Sondas do Designer no repositório (informativo, não é bug do app)
O Tech Lead informou que são a reprodução do formSheet do Designer; a limpeza foi pedida a ele. Em 17:26 as sondas já tinham saído de `src/`: typecheck limpo, 350/350 testes. O lint ainda acusa 1 warning em `.team/probes/formsheet/__probecopy.tsx:139` (pasta ignorada pelo git, fora do app); basta excluir `.team/` do ESLint ou apagar a cópia.

`src/app/(main)/__probe.tsx` e `__probecopy.tsx` não têm commit e apareceram na árvore durante a rodada (17:14). O `__probecopy.tsx` também mexeu em `Screen.tsx` e `_layout.tsx`, outras mãos no mesmo diretório.
- `npm run typecheck`: 5 erros, todos em `__probecopy.tsx` (TS18048/TS18047). Sem erros no resto do código.
- `npm run lint`: 1 warning em `__probecopy.tsx:139` (`no-require-imports`). O `--max-warnings=0` faz o lint falhar.
- Qualquer arquivo em `src/app/` vira rota; as sondas iriam para o build.
Antes do release: apagar as sondas ou movê-las para fora de `src/app`. Antes de rodar, eu tinha a árvore limpa (typecheck, lint e 350/350 testes verdes).

## BUG-03 — Botão voltar "(tabs)" (média)
Passos: home → pessoa (ou registro). Ler o botão voltar na árvore de acessibilidade.
Resultado: nome "(tabs)" (id `BackButton`). Nas telas de onboarding e login o nome é "Voltar".
Esperado: "Voltar" (ou "Família"). Corrigir o título do botão voltar nas telas dentro das abas.

## BUG-04 — Seletores sem nome (média)
Passos: Nova pessoa (modal) → ler "Parentesco" e "Sexo" na árvore de acessibilidade.
Resultado: dois `AXPopUpButton` sem nome nem valor. O rótulo visível é um texto separado.
Esperado: nome "Parentesco" e valor "Filho(a)" falados no foco. Evidência: leitura da árvore (sem captura própria).

## BUG-05 — Contraste do botão "Novo registro" no escuro (média, a medir)
Evidência: `dark-01-timeline-pessoa.png` e `dark-02-home.png`. Texto branco sobre azul claro (periwinkle). A olho fica perto de 2,5:1, abaixo dos 4,5:1 da WCAG AA. Não medi por pixel. Medir o par real de tokens. No claro o botão é azul-escuro e legível.

## BUG-06 e BUG-07 — Árvore de acessibilidade (média, a confirmar)
- BUG-06: depois de avançar do passo 3 do onboarding para o consentimento, ainda aparecem no mesmo nível "Só a sua família vê", "Passo 3 de 3" e "Começar". O mesmo ocorre no login, abaixo de "Digite o código". O VoiceOver pode focar elementos escondidos por baixo.
- BUG-07: "Família", "Ajustes" e a busca (barra de abas nativa) não aparecem como elementos. O toque físico funciona; o toque por acessibilidade não.
Preciso ligar o VoiceOver para confirmar; pelo driver só vejo a árvore.

## BUG-08 — AX5 na home (baixa)
Passos: `xcrun simctl ui booted content_size accessibility-extra-extra-extra-large` e abrir a home.
Resultado: o texto escala e nada some, mas o botão "Novo registro" passa da borda esquerda (o "+" encosta na borda). Evidência: `a11y-ax5-home.png`.

## BUG-09 — Revogar consentimento (baixa)
Passos: Ajustes → Revogar consentimento → confirmar.
Resultado: abre o onboarding (1 de 3); só depois de "Continuar" ×2 e "Começar" chega ao consentimento.
Esperado pelo texto da folha: "volta à tela de consentimento". Evidência: `set-03-revogar-vai-onboarding.png`.
Obs.: o redirecionamento acontece e não dá acesso aos dados sem novo aceite; reaceitar volta com os dados intactos.

## BUG-10 — "…" do detalhe tardio (baixa)
Uma captura logo ao abrir o detalhe mostrou a barra sem o "…" (`bug-detalhe-sem-menu.png`); ele apareceu em seguida. Não reproduzi nas outras aberturas. Reportar se o Mobile quiser investigar.

## BUG-11 — Excluir conta sob a barra de abas (baixa)
Em Ajustes (`set-01-exportar-claro.png`), a linha "Excluir conta" e seu texto de apoio ficam parcialmente atrás da barra de abas flutuante com a tela em repouso. A lista rola, mas não conferi se o último item chega a ficar totalmente acima da barra.

## Não são bugs (conferido)
- Engrenagem azul flutuante: do Expo Go.
- "Novo registro" e "Nova pessoa" abrem em modal de propósito. O modal pinta e rola.
- Sexta caixa do código parecia cortada numa captura, mas era frame de transição. Parada, cabe na tela.
