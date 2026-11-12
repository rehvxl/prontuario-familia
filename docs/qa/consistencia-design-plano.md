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
