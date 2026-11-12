---
version: 1
slug: "src-screens-family-home"
primary_target: "src/screens/family-home"
related_targets: ["src/screens/family-home/ui/MemberPanel.tsx","src/shared/ui"]
---

## Scope

App nativo inteiro (iOS 26 + Android), modo Operate. Primeira superfície: painel Família. Público: Ana (cuidadora, 38) e Carlos (67, crônico), no celular, de dia, na sala de espera ou na mesa da cozinha com a pasta de papéis.

## Direction contract

THESIS: A família é uma pasta com divisórias. Cada pessoa é uma divisória de cor plena, e os documentos e os dados dela são folhas por cima. Recusa os cartões brancos agrupados com um acento único (o padrão do app Saúde) e o editorial creme com serifa.

OWN-WORLD: Divisórias em matiz pleno: ultramar para a família, e óxido, cromo, grama, petróleo, violeta e siena para as pessoas. O vermelhão fica só para erro e ação destrutiva. Sobre a cor vai uma folha branca leitosa de tom fixo, sem furos. O tipo é uma grotesca de manual, Archivo SemiCondensed, num corpo só de 17 pt, com a hierarquia feita por peso e pela cor da divisória. Todo estado leva ícone e texto. Tab bar, folhas e menus são os nativos.

STORY: A Ana abre a pasta da família e vê o que acompanhar. Toca a aba do Carlos, e a pasta abre na divisória dele (a cor de cada pessoa vem da ordem de cadastro na família), com resumo, exames, vacinas, medicamentos e documentos.

FIRST VIEWPORT: A capa ultramar ocupa o fundo. À esquerda, a folha branca (cerca de 88% da largura) traz "Família Souza", a data, "Para acompanhar" (com a marca de aba de cada pessoa) e as pessoas. Na borda direita fica a régua de abas: a aba "Família" estendida e uma aba por pessoa, todas da mesma altura, com a contagem escrita nela. Embaixo, "Novo registro" e a tab bar nativa.

FORM: Pasta com divisórias, desafiante competitivo do catálogo (rw-manual-acetate-tab-board), escolhido pelo Douglas em 11/11/2026. A direção sorteada era a nº 3 da lista (Linhas da família). seed: 3b0950cc2d020c3e. Interação-assinatura: tocar numa aba troca a divisória na mesma tela, com capa, papel e conteúdo no mesmo quadro; a aba sai de trás da folha em 120 ms e o conteúdo entra em 150 ms; com Reduzir movimento, a troca é instantânea.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Tema escuro: a divisória escurece (matiz profundo) e a folha passa a grafite leitoso; a validar no aparelho.
- AX5: a régua de abas vira faixa horizontal no topo quando o texto passar de 1,35×.

- Revisão de 11/11/2026 (Tech Lead, após a revisão final pedir recaptura): a cor da pessoa passou a seguir a ordem de cadastro, para ser igual em qualquer aparelho. O STORY deixou de citar "verde".
- Revisão de 12/11/2026 (crítica do Douglas: "a tela dá uma piscada" e "os pontos cinza poderiam sair"): Família e pessoa viraram uma tela só (troca por estado, sem push), a troca em 2 quadros deu lugar à troca atômica com aba de 120 ms e fade de 150 ms, saíram os furos (margem de 34 para 20 pt), o papel ficou de tom fixo e as abas, de altura fixa.
