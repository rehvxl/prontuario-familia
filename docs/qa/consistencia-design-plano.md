# Consistência de design: plano e andamento

Origem: análise de todas as telas contra `docs/DESIGN_SYSTEM.md` v4 (12/11/2026): código das 26 telas e das 19 capturas de `docs/screenshots/jornada/` (iOS, claro, demo).
Branch: `fix/consistencia-design`.

## Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | O código vale; o doc §3.1 foi alinhado: fluxo de entrada, Ajustes e Buscar ficam em `board="ultramar"` | É o que as capturas da jornada e o README mostram |
| D2 | Criar família e Primeiras pessoas passam a ser sem cabeçalho nativo, com `edges` de topo | O cabeçalho (`title: ''`, sem voltar, gesto desligado) só gerava ~80 pt de cor vazia |
| D3 | Folha com pessoa conhecida leva filete na cor dela; Novo registro e Nova pessoa não | A pessoa de Novo registro muda dentro da folha |
| D4 | Título da folha é o nativo; `Screen heading` sai de Medicamento, Sinal vital e Dose | Duplicava o título |
| D5 | Tile de tipo de registro = `IconTile` neutro (36/10) | Doc §8 e Ajustes; o de Documentos tinha 44/12 |
| D6 | Checkbox com `radii.sm` nas duas plataformas | No iOS o raio 14 virava círculo e lia como rádio |

## Checklist

- [x] D1 doc §3.1, §7.0 (furos de fichário)
- [x] D2 `(setup)/_layout`, `CreateFamilyScreen`, `FirstMembersScreen`
- [x] D4 `NewMedicationScreen`, `NewVitalScreen`, `NewVaccineDoseScreen`
- [x] D5 `RecordListItem`
- [x] D6 `Checkbox`
- [x] Editar pessoa: divisória já no carregamento e no erro (sem salto de cor)
- [x] `Banner` do `DismissRuleSheet` com margem `space[4]` (as demais já usam 4)
- [x] Comentários "título serifado" nos layouts de rota
- [x] Verificação: `npx tsc --noEmit` ok, `npx expo lint` sem avisos, `npx jest` 125 suítes / 1407 testes ok (4 testes de folha passaram a conferir o `testID`, já que o título é nativo)
- [ ] Conferência visual no simulador (Criar família, Primeiras pessoas, Documentos, Consentimento, Editar pessoa, folhas de medicamento/sinal vital/dose)

## Fora desta rodada (precisa de decisão de produto ou de captura)

| Achado | Por que ficou |
|---|---|
| "Adicionar" em quatro lugares (barra, botão flutuante, seção, estado vazio) | Mudar o lugar muda a jornada; definir um padrão por tipo de tela |
| "Excluir" em quatro entradas (menu "…", folha de ações, botão ghost, linha) | Idem |
| Avatar com três tratamentos (`MemberForm`, Ajustes, capa de Criar família) | Pede decisão de design sobre a forma do avatar |
| Anatomia das linhas de lista (tile, ícone solto, marca de aba, nada; "…" × chevron) | Parte é por tipo de conteúdo; revisar com o desenho |
| `DemoSeal` de Entrar e Código | Intencional: quebra linha em texto grande, o `Badge` não. Falta só o ícone |
| Spinner × skeleton nos demais carregamentos | O doc manda skeleton; hoje só as listas |
| Ritmo vertical 28 × 32 e valores soltos (`fontWeight`, `paddingVertical: 14`, `minHeight: 64`) | Baixo impacto; tratar junto com tokens |
| Barra de status por três mecanismos | Sem desvio visual; refatoração própria |
| Estado "não encontrado": ícone e rótulo variam | Copy |

---

# Rodada 2 (preparada em 13/11/2026)

Base: a `main` após o PR #11. Cada item abaixo foi reconferido no código antes de entrar aqui. A reconferência **corrigiu três achados do relatório de 12/11**:

- **Avatar:** Ajustes, `MemberForm` e `MemberListItem` já usam o mesmo `Avatar` (`shared/ui`). O cinza do `MemberForm` é o estado "ainda sem nome" (`MemberForm.tsx:70`), de propósito. A letra única em Ajustes vem do e-mail (`accountName`). Sobra só o cartão `CoverLabel` de Criar família e os valores soltos do placeholder.
- **Ícone solto no Resumo × tile em Documentos:** são papéis diferentes. No Resumo o ícone é o **estado** (`StateLine`, ícone na tinta, doc §3.1); em Documentos é o **tipo** (tile neutro). Não é desvio.
- **Spinner × skeleton:** o Spinner está só em telas de **um objeto** (registro, pessoa, resultado) e em folhas, onde não há forma de lista a imitar. O doc §7.1 fala de seções. É regra a escrever, não tela a mudar.

## Decisões (D7 a D11)

Douglas delegou a decisão em 13/11/2026; todas as recomendações abaixo foram aceitas.

| # | Pergunta | Recomendação | Se aceitar, muda |
|---|---|---|---|
| D7 | Onde fica "Adicionar" em telas de lista de uma pessoa? | **Botão "+" na barra** em Exames, Medicamentos, Sinais vitais e **Vacinas**. O botão flutuante fica só para "Novo registro" (Família e Pessoa), que cria documento. Série do exame mantém "Adicionar" na seção (contexto do exame) | `MemberVaccinesScreen`: sai `FloatingActions`/`useFloatingFooterInset`, entra `Stack.Toolbar.Button`; testes (`register-dose-fab`); doc §7.7 |
| D8 | Regra de "Excluir" | **Objeto da tela** (registro, pessoa) → menu "…" na barra. **Item de lista** (dose, resultado) → folha de ações ao tocar na linha. **Medicamento** (detalhe em folha) → mantém o botão destrutivo no fim, por ser detalhe completo, não menu. Só documentar, sem mexer em tela | doc §7 (regra comum) |
| D9 | Linha "Pessoas" na Família: "…" ou chevron? | **Chevron**, como as outras listas. O "…" (editar/novo registro) já existe no título da pessoa e na folha dela | `FamilyHomeScreen.tsx:145` (`Menu` por linha) e testes |
| D10 | Spinner nas telas de um objeto | **Manter**; escrever a regra no doc §7.1 | doc |
| D11 | Ritmo entre seções: 28 ou 32? | **28** (`space[7]` e `sectionHeaderTop`, o que as telas já usam). Conferir se `layout.sectionGap` (32) ainda tem uso; se não, alinhar o token | `spacing.ts`, `MemberVitalsScreen` |

## Pacotes (um PR cada, na ordem)

1. **Padrões de interação** (D7, D8, D9, D10 no doc). Risco médio: muda jornada e testes. Esforço: ~½ dia.
2. **Infra de tela** (sem mudança visual):
   - Extrair `useBoardStatusBar(style)` para `shared/ui` com foco embutido. Hoje são 3 cópias de `setStatusBarStyle` (Ajustes, Buscar, Registro) e 8 `{focused ? <StatusBar/> : null}`.
   - D11.
   - Tokenizar os valores soltos: `fontWeight` em `ExamSeriesScreen:294`, `FoundItems:270`, `SuggestionNote:65`; `paddingVertical: 14` em `MemberHealthSummary:375` e `MeasurementRow:63`; `minHeight: 64` em `MedicationRow:74`; placeholder do `MemberForm` (cantos 6/16, 22/26/700).
   Risco baixo. Esforço: ~½ dia.
3. **Estado "não encontrado"**: um texto-padrão e um ícone por tipo (pessoa, registro, exame, dose); rótulo "Voltar" (em folha, "Fechar"). Só copy. Esforço: ~1 h.

Fora: o cartão `CoverLabel` de Criar família (decorativo, sem token equivalente) e o idioma do botão da Apple (vem do sistema).

## Antes de começar a rodada (pré-requisitos)

- [x] (13/11/2026, iPhone 17 Pro simulado, iOS 26.5, modo demo, `main` em `1ce285a`) Conferir no simulador as telas do PR #11 (Criar família, Primeiras pessoas, Documentos, Consentimento, Editar pessoa, folhas de medicamento/sinal vital/dose) e anotar o que sair errado aqui.
- [ ] Responder D7 a D11 (ou aceitar as recomendações).
- [ ] A árvore de trabalho tem mudanças de outra tarefa (docs e `ExamSeriesScreen`, entre outros). Fazer a rodada em branch própria, a partir da `main` limpa, e não misturar.

## Andamento da rodada 2

- [x] PR A, padrões de interação: D7 (Vacinas com "+" na barra, sem botão flutuante), D8 e D10 (regras no doc §7.1), D9 (Pessoas sem menu "…" por linha; "Editar pessoa" e "Novo registro" ficam na tela da pessoa). Testes ajustados.
- [x] PR B, infra de tela: hook único `useBoardStatusBar` (Ajustes, Buscar, Registro); D11 (`layout.sectionGap` 32 → 28, token sem uso nas telas); "não encontrado" padronizado (Editar pessoa sem `tone="error"`, regra no doc).
- Decidido não fazer: tokenizar `fontWeight` (passa por `Text`, que escolhe o arquivo Archivo) nem `paddingVertical: 14`/`minHeight: 64` (3 ocorrências de anatomia de linha, sem ganho). O `{focused ? <StatusBar/> : null}` das telas da pessoa também fica: é o padrão do Expo Router e já está correto.

## Conferência no simulador (13/11/2026)

iOS 26.5 (simulador novo, só para isso), claro e escuro, a partir da `main` após o PR #12. Percorrido: Boas-vindas → Consentimento → Entrar → Código → Criar família → Primeiras pessoas → Família → Pessoa (Documentos) → Carteira de vacinas → folha de dose → Editar pessoa.

| Item | Resultado |
|---|---|
| Checkbox do Consentimento e da folha de dose | Quadrado arredondado; marcado e desmarcado legíveis |
| Criar família e Primeiras pessoas | Faixa de cor com a mesma altura de Entrar; sem cabeçalho vazio; régua ilustrativa só em Primeiras pessoas |
| Família | Linha de pessoa com chevron, sem "…" |
| Carteira de vacinas | Botão "+" na barra; sem botão flutuante |
| Folha de dose | Título uma vez ("Nova dose"), filete verde da pessoa |
| Documentos | Tile neutro de 36 pt, linhas mais baixas |
| Editar pessoa | Cabeçalho e fundo na divisória da pessoa; menu "…" na barra |
| Tema escuro (Pessoa/Documentos) | Sem problema visível |

**Não conferido:** Android, texto grande (AX5), folhas de medicamento e sinal vital (mesmo caminho de código da folha de dose), e os estados de carregamento/erro de Editar pessoa e Primeiras pessoas (rápidos demais para capturar no modo demo).

## Conferência no Android (13/11/2026)

Emulador Pixel 7, Android 16 (API 36), AVD criado só para isso, modo demo, `main` em `38d8a93`. Percorrido: Boas-vindas → Consentimento → Entrar → Código → Criar família → Primeiras pessoas → Família → Carteira de vacinas → folha de dose; depois texto em 2,0× (o máximo do Android) em Pessoa e Vacinas.

| Item | Resultado |
|---|---|
| Checkbox (Consentimento, folha de dose) | Mesmo raio do iOS |
| Primeiras pessoas | Faixa e barra de status certas, sem cabeçalho vazio |
| Carteira de vacinas | "+" na barra, sem botão flutuante |
| Folha de dose (modal no Android) | Título uma vez, filete verde da pessoa |
| Texto 2,0×: régua | Vira faixa no topo, como o doc manda |
| Texto 2,0×: botão flutuante | Só o ícone, e nas Vacinas já não cobre conteúdo (é "+" na barra) |

### Achados novos (já existiam antes das rodadas 1 e 2)

1. **`StatTileGroup` quebra palavra no meio em 2,0×** ("pendênci/as", "registrad/as", "informad/as" em Carteira de vacinas). Causa: `STACK_FONT_SCALE = 2.35` (`shared/ui/lib/` do `useStackedLayout`) é o AX3 do iOS, mas o Android não passa de 2,0× e o texto do app é limitado a 2× (`maxFontSizeMultiplier`). No Android a pilha nunca liga. Correção sugerida: empilhar a partir de ~1,75× (ou medir a largura do rótulo) e conferir `StatTile`, linhas de métrica e ações, que usam o mesmo hook.
2. **Chip de estado cortado em 2,0× no Resumo**: "Acima da faixa" aparece como "Acima da" ao lado da régua (`MeasurementRow`). O doc §7.1 manda empilhar em AX5; mesma causa do item 1.

Não conferido no Android: folha de sinal vital e de medicamento, Documentos e Buscar.

### Correção dos achados de texto grande (13/11/2026)

`STACK_FONT_SCALE` passou de 2,35 (iOS AX3) para 1,75: liga no Android grande (máximo 2,0×) e no iOS de AX2 em diante. Conferido: Android em 2,0× (Carteira de vacinas com os três números empilhados, "Dentro da faixa" e "Acima da faixa" inteiros no Resumo, "Ver tudo" abaixo do título) e iOS 26.5 em AX2 (Carteira de vacinas empilhada). Testes: `SectionHeader` empilha em 2,4×, 2,0× e 1,75× e mantém o fio em 1,5×.
