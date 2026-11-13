---
name: Prontuário da Família
description: A família é uma pasta com divisórias; cada pessoa é uma divisória de cor plena e os documentos dela são folhas por cima.
colors:
  # Tema claro (normativo). O escuro está em .impeccable/design.json › colorMeta.<token>.dark e em src/shared/ui/tokens/colors.ts.
  # Tinta da divisória atual (fora de uma divisória = ultramar)
  primary: "#2B3FB8"
  primaryPressed: "#233497"
  onPrimary: "#FFFFFF"
  primarySoft: "#D3D7EE"
  onPrimarySoft: "#2B3FB8"
  focusRing: "#2B3FB8"
  rangeBand: "#D3D7EE"
  # Divisórias: board (cor plena), onBoard (texto sobre ela), ink (matiz como tinta na folha), soft (diluído), leaf (folha 92% branca sobre o board)
  ultramar-board: "#2B3FB8"
  ultramar-onBoard: "#FFFFFF"
  ultramar-ink: "#2B3FB8"
  ultramar-soft: "#D3D7EE"
  ultramar-leaf: "#EEF0F9"
  oxido-board: "#D9541E"
  oxido-onBoard: "#100E0C"
  oxido-ink: "#A83A0E"
  oxido-soft: "#EFDAD5"
  oxido-leaf: "#EEF0F9"
  cromo-board: "#F2B90F"
  cromo-onBoard: "#100E0C"
  cromo-ink: "#7A5800"
  cromo-soft: "#F3EBD3"
  cromo-leaf: "#EEF0F9"
  grama-board: "#3E8E3A"
  grama-onBoard: "#100E0C"
  grama-ink: "#2D6B2A"
  grama-soft: "#D6E4DA"
  grama-leaf: "#EEF0F9"
  petroleo-board: "#127A80"
  petroleo-onBoard: "#FFFFFF"
  petroleo-ink: "#0E6469"
  petroleo-soft: "#CFE0E5"
  petroleo-leaf: "#EEF0F9"
  violeta-board: "#6B3FA0"
  violeta-onBoard: "#FFFFFF"
  violeta-ink: "#6B3FA0"
  violeta-soft: "#DDD7EA"
  violeta-leaf: "#EEF0F9"
  siena-board: "#8A4B2A"
  siena-onBoard: "#FFFFFF"
  siena-ink: "#8A4B2A"
  siena-soft: "#E2D9D7"
  siena-leaf: "#EEF0F9"
  oliva-board: "#7A8418"
  oliva-onBoard: "#100E0C"
  oliva-ink: "#5A6110"
  oliva-soft: "#E0E2D4"
  oliva-leaf: "#EEF0F9"
  # Vermelhão: só erro e ação destrutiva
  danger: "#BF1F2F"
  dangerPressed: "#9E1926"
  onDanger: "#FFFFFF"
  dangerSoft: "#F8E3E3"
  onDangerSoft: "#9A1824"
  # Estados clínicos: tinta neutra (success/warning/info usam os mesmos valores)
  clinicalIn: "#3A3F5C"
  clinicalInSoft: "#E7E9F1"
  onClinicalInSoft: "#2E3350"
  clinicalHigh: "#141833"
  clinicalHighSoft: "#E1E3EC"
  onClinicalHighSoft: "#141833"
  clinicalLow: "#141833"
  clinicalLowSoft: "#E1E3EC"
  onClinicalLowSoft: "#141833"
  clinicalNone: "#575C7A"
  clinicalNoneSoft: "#ECEDF3"
  onClinicalNoneSoft: "#474C6B"
  # Neutros
  background: "#F3F4F8"
  surface: "#FBFBFD"
  surfaceSunken: "#E6E8F0"
  surfaceRaised: "#FFFFFF"
  scrim: "rgba(10, 14, 40, 0.38)"
  textPrimary: "#141833"
  textSecondary: "#474C6B"
  textTertiary: "#575C7A"
  textInverse: "#FFFFFF"
  textDisabled: "#A3A7BC"
  border: "#D5D8E6"
  borderStrong: "#7A7F9E"
  rangeTrack: "#E1E3EC"
typography:
  largeTitle:
    fontFamily: "ArchivoSC-Bold, System"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: "40px"
    letterSpacing: "-0.6px"
  title1:
    fontFamily: "ArchivoSC-Bold, System"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: "36px"
    letterSpacing: "-0.5px"
  title2:
    fontFamily: "ArchivoSC-Bold, System"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: "26px"
    letterSpacing: "-0.2px"
  headline:
    fontFamily: "ArchivoSC-SemiBold, System"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: "22px"
    letterSpacing: "0px"
  body:
    fontFamily: "ArchivoSC-Regular, System"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: "22px"
    letterSpacing: "0px"
  bodyStrong:
    fontFamily: "ArchivoSC-SemiBold, System"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: "22px"
    letterSpacing: "0px"
  label:
    fontFamily: "ArchivoSC-SemiBold, System"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: "22px"
    letterSpacing: "0px"
  subheadline:
    fontFamily: "ArchivoSC-Regular, System"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "0px"
  footnote:
    fontFamily: "ArchivoSC-Regular, System"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
    letterSpacing: "0.1px"
  caption:
    fontFamily: "ArchivoSC-Medium, System"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "18px"
    letterSpacing: "0.1px"
  metricHero:
    fontFamily: "ArchivoSC-Bold, System"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: "40px"
    letterSpacing: "-0.4px"
    fontFeature: "tnum"
  metric:
    fontFamily: "ArchivoSC-SemiBold, System"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "26px"
    letterSpacing: "0px"
    fontFeature: "tnum"
  metricUnit:
    fontFamily: "ArchivoSC-Regular, System"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "0px"
rounded:
  none: "0px"
  bar: "2px"
  tab: "8px"
  tile: "10px"
  field: "12px"
  leaf: "16px"
  sheet: "34px"
  control: "999px"
spacing:
  "0.5": "2px"
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "7": "28px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "16": "64px"
  leafGutter: "12px"
  screenGutter: "20px"
  fieldGap: "20px"
  sectionGap: "32px"
  leafMargin: "20px"
components:
  divider-board:
    backgroundColor: "{colors.ultramar-board}"
    textColor: "{colors.ultramar-onBoard}"
  leaf:
    backgroundColor: "{colors.ultramar-leaf}"
    textColor: "{colors.textPrimary}"
    rounded: "{rounded.leaf}"
    padding: "16px 12px 24px 34px"
  rail-tab:
    backgroundColor: "{colors.oxido-board}"
    textColor: "{colors.oxido-onBoard}"
    typography: "{typography.subheadline}"
    rounded: "{rounded.tab}"
    padding: "10px 0 8px"
    width: "35px"
    height: "64px"
  rail-tab-selected:
    backgroundColor: "{colors.ultramar-board}"
    textColor: "{colors.ultramar-onBoard}"
    typography: "{typography.subheadline}"
    rounded: "{rounded.none}"
    padding: "10px 0 8px"
    width: "40px"
  tab-mark:
    backgroundColor: "{colors.cromo-board}"
    rounded: "4px"
    width: "10px"
    height: "14px"
  button-filled:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.onPrimary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 24px"
    height: "52px"
  button-filled-pressed:
    backgroundColor: "{colors.primaryPressed}"
    textColor: "{colors.onPrimary}"
  button-tonal:
    backgroundColor: "{colors.primarySoft}"
    textColor: "{colors.onPrimarySoft}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 24px"
    height: "52px"
  button-tonal-pressed:
    backgroundColor: "{colors.surfaceSunken}"
    textColor: "{colors.onPrimarySoft}"
  button-plain:
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 24px"
    height: "52px"
  button-destructive:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.onDanger}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 24px"
    height: "52px"
  button-disabled:
    backgroundColor: "{colors.surfaceSunken}"
    textColor: "{colors.textDisabled}"
  fab:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.onPrimary}"
    typography: "{typography.bodyStrong}"
    rounded: "16px"
    height: "56px"
  text-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.textPrimary}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "0 16px"
    height: "52px"
  text-field-disabled:
    backgroundColor: "{colors.surfaceSunken}"
    textColor: "{colors.textDisabled}"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.textPrimary}"
    typography: "{typography.subheadline}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "36px"
  chip-selected:
    backgroundColor: "{colors.primarySoft}"
    textColor: "{colors.onPrimarySoft}"
    typography: "{typography.subheadline}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "36px"
  state-chip-high:
    backgroundColor: "{colors.clinicalHighSoft}"
    textColor: "{colors.onClinicalHighSoft}"
    typography: "{typography.caption}"
    rounded: "{rounded.control}"
    padding: "3px 9px 3px 6px"
  state-chip-in:
    backgroundColor: "{colors.clinicalInSoft}"
    textColor: "{colors.onClinicalInSoft}"
    typography: "{typography.caption}"
    rounded: "{rounded.control}"
    padding: "3px 9px 3px 6px"
  state-chip-none:
    backgroundColor: "{colors.clinicalNoneSoft}"
    textColor: "{colors.onClinicalNoneSoft}"
    typography: "{typography.caption}"
    rounded: "{rounded.control}"
    padding: "3px 9px 3px 6px"
  list-item:
    textColor: "{colors.textPrimary}"
    typography: "{typography.body}"
    padding: "12px 0"
    height: "52px"
  range-bar-track:
    backgroundColor: "{colors.rangeTrack}"
    rounded: "{rounded.bar}"
    height: "4px"
    width: "112px"
  range-bar-band:
    backgroundColor: "{colors.rangeBand}"
    rounded: "{rounded.bar}"
    height: "4px"
---

# Design System: Prontuário da Família

## Overview

**Creative North Star: "A pasta com divisórias"**

A família é uma pasta de papéis como a que a Ana leva para a mesa da cozinha. Cada pessoa é uma divisória de cor plena; os documentos e os dados dela são uma folha leitosa pousada por cima; na borda direita, a régua de abas mostra a pasta inteira de uma vez, com a altura de cada aba proporcional aos documentos da pessoa. A cor não decora: ela diz **de quem** é o que está na tela. Por isso nada mais disputa cor com as pessoas. Estados clínicos, tipos de registro, sucesso e aviso ficam em tinta neutra com ícone e texto.

O tipo é uma grotesca de manual de instruções, Archivo SemiCondensed, num corpo quase único de 17 pt. A hierarquia vem do peso (400 a 700) e da tinta da divisória, não de muitos tamanhos. A densidade é a de um caderno: linhas separadas por fio fino sobre a folha, sem cartões flutuantes. A estrutura é nativa (tab bar, pilha, sheets, menus, `Switch`, `Select`, `SegmentedControl` do sistema); o mundo empresta só tipo, paleta, densidade e um movimento-assinatura seco.

Este mundo substitui o "Cuidado sereno" (serifa New York, sálvia, papel creme), rejeitado pelo Douglas em 11/11/2026, e recusa também os cartões brancos agrupados com um acento único, padrão do app Saúde.

**Key Characteristics:**
- Divisória de matiz pleno atrás de cada tela de pessoa e da família (ultramar).
- Folha de papel de tom fixo (8% do ultramar sobre o branco) em toda a pasta, sem furos, com canto superior direito arredondado.
- Régua de abas vertical na borda direita, com rótulo girado 90° e a contagem de documentos escrita na aba.
- Um corpo de 17 pt em Archivo SemiCondensed; títulos em Bold, nunca serifa.
- Todo estado com ícone e texto; o vermelhão só para erro e ação destrutiva.
- Troca de divisória no mesmo quadro (capa, papel e conteúdo juntos): a aba sai de trás da folha em 120 ms e o conteúdo entra em 150 ms de opacidade; instantânea com Reduzir movimento.

## Colors

Oito matizes plenos de papelaria contra uma tinta quase preta e azulada; o resto é neutro de propósito.

### Primary
- **Ultramar da capa** (`ultramar-board`): a divisória da família, fundo do painel Família, aba "Família" e tinta padrão (`primary`) de tudo o que está fora de uma divisória de pessoa. Botão cheio, FAB, link, título de tela (`largeTitle` na tinta), linha do gráfico e marcador da régua.
- **`primary*` é a tinta da divisória atual**, não uma cor fixa. Dentro de `DividerBoard`/`HueProvider` o tema troca `primary`, `primaryPressed`, `onPrimary`, `primarySoft`, `onPrimarySoft`, `focusRing` e `rangeBand` pelo `ink`, `inkPressed`, `onInk` e `soft` da pessoa. Os valores do frontmatter são os do ultramar.

### Secondary (as divisórias das pessoas)
Sete matizes, na ordem de cadastro na família (`registerPersonHues`: 1.ª pessoa = óxido, 2.ª = cromo, e assim por diante; da 8.ª em diante repetem). Cada um tem cinco papéis:
- **`board`**: cor plena da divisória (fundo da tela da pessoa, aba na régua, capa do `Avatar`, `TabMark`).
- **`onBoard`**: texto e ícone sobre a divisória. Óxido, cromo, grama e oliva levam tinta escura (`#100E0C`); ultramar, petróleo, violeta e siena levam branco.
- **`ink`**: o matiz como texto, ícone e traço sobre a folha (≥ 4,5:1). Em cromo e óxido é bem mais escuro que o `board`, porque o amarelo e o laranja plenos não passam como texto.
- **`soft`**: o matiz diluído (faixa do laudo, chip e segmento selecionados, `DemoBadge`). Decorativo, abaixo de 3:1.
- **`leaf`**: a folha sobre essa divisória, `mixHex('#FFFFFF', board, 0.08)`. O papel pega um traço da cor de baixo (cromo vira `#FEF9EC`, ultramar `#EEF0F9`).

Nomes: **Óxido** (laranja de carimbo), **Cromo** (amarelo de pasta escolar), **Grama**, **Petróleo**, **Violeta**, **Siena** (marrom de envelope), **Oliva**.

### Tertiary (vermelhão)
- **Vermelhão** (`danger`): só erro de campo, mensagem de falha e ação destrutiva (excluir conta, excluir pessoa). `dangerSoft`/`onDangerSoft` para o botão tonal destrutivo e o fundo do aviso de erro.

### Neutral
- **Branco leitoso frio** (`background`): fundo das telas sem divisória (formulários em sheet, login, Ajustes, Buscar). Dentro da `Leaf`, `background` passa a ser o `leaf` do matiz.
- **Folha de campo** (`surface`): campos de texto, chip não selecionado, segmento escolhido.
- **Afundado** (`surfaceSunken`): trilhos, skeleton, botão desabilitado, linha pressionada, tile de tipo de registro.
- **Elevado** (`surfaceRaised`): sheets, menus, fallback sólido do vidro.
- **Tinta** (`textPrimary`), **tinta secundária** (`textSecondary`), **terciária** (`textTertiary`, ainda ≥ 4,5:1), **desabilitada** (`textDisabled`).
- **Fio** (`border`): linha fina entre linhas da folha e ao lado do título de seção. **Contorno** (`borderStrong`): campos e chips, ≥ 3:1 sobre `surface`.
- **Trilho** (`rangeTrack`): trilho da régua do laudo.
- **Escala clínica neutra**: `clinicalIn` (tinta média), `clinicalHigh`/`clinicalLow` (tinta forte), `clinicalNone` (tinta fraca), cada um com `*Soft` e `on*Soft`. `success`, `warning` e `info` usam os mesmos valores.

**Tema escuro.** A divisória vira o matiz profundo (ex.: ultramar `#1B2672`), a aba sobe um tom (`tab`) para aparecer sobre outra divisória e a folha é o grafite leitoso `#1E2029` em toda divisória. Os valores completos estão em `colors.ts` (`darkColors`, `darkHues`) e no sidecar.

### Named Rules
**The Color Is Identity Rule.** Matiz pleno significa pessoa. Tipo de registro usa `NEUTRAL_CATEGORICAL` (tile `surfaceSunken` + ícone `textSecondary`); estado clínico usa a escala neutra. Um exame nunca "parece" ser do Carlos por estar na cor dele sem estar na divisória dele.

**The Vermilion Reserve Rule.** `danger` aparece só em erro e ação destrutiva. Valor fora da faixa do laudo nunca é vermelho.

**The Name Beside the Color Rule.** Toda `TabMark`, aba e capa leva o nome da pessoa escrito ao lado. A cor nunca é a única pista de quem é.

**The Ink From the Board Rule.** Nunca escreva texto no `board` de cromo, óxido, grama ou oliva com a cor do próprio matiz. Sobre a folha, use `ink`; sobre a divisória, `onBoard`.

## Typography

**Display Font:** Archivo SemiCondensed Bold (`ArchivoSC-Bold`, com a fonte do sistema como fallback)
**Body Font:** Archivo SemiCondensed Regular / SemiBold (`ArchivoSC-Regular`, `ArchivoSC-SemiBold`)
**Label Font:** a mesma família, em Medium (`ArchivoSC-Medium`) para legendas

**Character:** grotesca semicondensada de manual técnico: firme, legível de perto, sem afetação. Um arquivo estático por peso (400, 500, 600, 700); o `Text` escolhe o arquivo pelo peso, e no Android tira o `fontWeight` do estilo para não somar negrito sintético. Tamanhos em pt lógicos do React Native.

### Hierarchy
- **Large Title** (`largeTitle`): título da tela-raiz ("Família Souza"), na tinta da divisória.
- **Title 1** (`title1`): nome da pessoa e título de detalhe.
- **Section** (`title2`, igual a `title3`): cabeçalho de seção ("Para acompanhar", "Pessoas", "Medicamentos em uso").
- **Body** (`body`, `bodyStrong`, `headline`, `label`, `callout`): um corpo só de 17 pt faz quase tudo; título de linha em SemiBold, texto corrido em Regular, rótulo de botão em SemiBold.
- **Subheadline** (`subheadline`): apoio (data, "Cônjuge · 67 anos · 6 documentos"), meta à direita da linha, rótulo da aba da régua (em 600, 700 na aba atual).
- **Footnote / Caption** (`footnote`, `caption`): rodapés obrigatórios (A1, A3…), origem do dado (S5), rótulo do `StateChip`. Nada legível abaixo de 13 pt.
- **Metric** (`metricHero`, `metric`, `metricUnit`): valor clínico em numerais tabulares; a unidade fica a 4 pt do valor, nunca colada.

### Named Rules
**The One Body Rule.** Hierarquia por peso e tinta, não por tamanho. Os tamanhos são 34, 30, 20, 17, 15 e 13; não crie outro.

**The Tabular Figures Rule.** Métricas, datas de lista, contagens das abas e eixos do gráfico usam `tabular-nums`.

**The No Serif Rule.** Nenhuma serifa, em nenhuma plataforma (a serifa era o mundo rejeitado).

## Layout

A tela de pessoa e o painel Família são uma linha horizontal: a divisória ocupa o fundo; à esquerda fica a folha (`flex: 1`, cerca de 88% da largura num iPhone) e à direita a régua de abas (40 pt, `layout.railWidth`). A folha começa logo abaixo da barra de status (painel Família, sem cabeçalho) ou abaixo do cabeçalho opaco na cor da divisória (pessoa, com título e voltar sobre o `board`).

Dentro da folha, o texto começa a `leafMargin` (20 pt) da borda esquerda e termina a `leafGutter` da borda direita. Telas sem divisória usam `screenGutter` dos dois lados e `maxContentWidth` de 640 pt. Entre seções, `sectionGap`; entre campos, `fieldGap`. Grade de 4 pt (`space`).

Linhas de lista: altura mínima 52 pt (64 com subtítulo), 12 pt de respiro vertical, fio fino embaixo. Controles com 52 pt de altura (`controlHeight`), toque mínimo 44 pt no iOS e 48 dp no Android.

**Tamanho de texto.** Com `fontScale ≥ 1,35` (`RAIL_STRIP_FONT_SCALE`), a régua sai da borda direita e vira faixa horizontal rolável no topo, com abas em pé e cantos de baixo arredondados. Com `fontScale ≥ 1,75` (`STACK_FONT_SCALE`: o Android grande, que não passa de 2,0×, e o iOS de AX2 em diante), linhas lado a lado empilham (rótulo em cima, valor embaixo), o fio ao lado do título de seção sai, o gráfico cresce para 240 pt e a régua do laudo ocupa a largura.

### Named Rules
**The Rail Is Never the Only Way Rule.** A régua de abas é um atalho; a lista "Pessoas" na folha leva ao mesmo lugar.

## Elevation & Depth

Profundidade de papel empilhado, não de cartões. Conteúdo na folha é plano, separado por fio de 1 pt. A sombra existe para três coisas físicas: a folha pousada sobre a divisória (sombra suave no alto e à direita, que cai sobre as abas como se elas saíssem de trás da folha), a aba não selecionada sobre a divisória e o elemento flutuante (FAB, banner offline). A aba atual não tem sombra: ela é a própria divisória, emendada à cor de fundo. Os furos de fichário têm sombra interna, para lerem como corte no papel e não como marcador.

### Shadow Vocabulary
- **Folha pousada** (`boxShadow: 2px -1px 6px rgba(5, 10, 40, 0.24)`; escuro `rgba(0, 0, 0, 0.55)`): invólucro da `Leaf`.
- **Aba sobre a divisória** (`boxShadow: 0 1px 3px rgba(5, 10, 40, 0.35)`): abas não selecionadas da `TabRail`.
- **Flutuante** (`boxShadow: 0 6px 16px rgba(20, 25, 70, 0.24), 0 1px 3px rgba(20, 25, 70, 0.2)`; Android `elevation: 3`; nada no escuro): FAB e `Banner appearance="floating"`.

### Named Rules
**The Declare Depth Once Rule.** Um elemento usa fio (conteúdo, níveis 0 e 1) ou sombra (flutuante, nível 2), nunca os dois. Sheets: sombra no claro, fio no escuro.

**The Glass Stays Native Rule.** Vidro só onde o sistema já aplica (tab bar, sheets nativas, botões do cabeçalho do iOS 26) e em `GlassSurface` sobre imagem. Sobre a divisória, o cabeçalho é opaco na cor dela.

## Shapes

Forma de papelaria: retângulos com um só canto mole. A folha arredonda apenas o canto superior direito (`leaf`, curva contínua). As abas arredondam só a ponta que sai da folha (`tab`, cantos direitos na régua, cantos de baixo na faixa); a aba atual perde o raio porque se funde à divisória. A `TabMark` repete essa ponta em miniatura (10 × 14 pt, raio 4; tamanho `md` 14 × 20, raio 5) e a capa do `Avatar` também: cantos esquerdos quase retos (10% do lado) e cantos direitos de aba (28%).

Controles de ação são cápsula (`control`): botões, chips, `StateChip`. Campos de texto têm canto de 12 (`field`), porque o texto precisa de canto para respirar. A régua do laudo usa trilho de 4 pt com raio 2 (`bar`) e marcador redondo de 12 pt com anel de 2 pt na cor da folha. Os furos de fichário são círculos de 12 pt, a 11 pt da borda, nas alturas 72, 372 e 672 pt, com aro de 1 pt (`leafRim`) e fundo `leafHole` (a folha em sombra, nunca a tinta da divisória).

## Components

### Buttons
Firmes e cheios, na tinta de quem está na tela.
- **Shape:** cápsula (raio = metade da altura; 52 pt no tamanho `md`, 44/48 no `sm`).
- **Filled:** fundo `primary`, rótulo `onPrimary` em `label` (17 SemiBold), 24 pt de respiro lateral (16 no `sm`). No iOS é o `borderedProminent` do SwiftUI com tint = tinta da divisória; no Android, Filled button do M3.
- **Pressed:** `primaryPressed` (iOS); ripple no Android.
- **Tonal (`bordered`/`glass`):** `primarySoft` com `onPrimarySoft`; pressionado em `surfaceSunken`.
- **Plain:** sem fundo, texto `primary`; pressionado em `primarySoft`.
- **Destrutivo:** `danger`/`onDanger` (cheio) ou `dangerSoft`/`onDangerSoft` (tonal); plain em `danger`.
- **Disabled:** fundo `surfaceSunken`, texto `textDisabled`.
- **Focus:** anel de 2 pt em `focusRing`, afastado 4 pt, raio do botão + 3.

### Floating Action Button
- "Novo registro": sólido em `primary`, rótulo `bodyStrong` em `onPrimary`, ícone "+", altura 56. Sombra "Flutuante". iOS: `borderedProminent` em cápsula; Android: FAB estendido do M3 com raio 16. Em AX5, só o ícone (o rótulo fica para o leitor de tela).

### Chips
- **Style:** cápsula de 36 pt (toque estendido a 44/48 por `hitSlop`), fundo `surface`, contorno de 1 pt `borderStrong`, texto `subheadline` 500 em `textPrimary`.
- **State:** selecionado em `primarySoft` com `onPrimarySoft`, texto 600 e ícone de check, sem contorno.

### StateChip
- Cápsula `control` no `*Soft` do estado, ícone de 15 pt e rótulo `caption` 600 no `on*Soft`. Texto curto ("Acima da faixa") ou longo ("Acima da faixa do laudo"); o leitor de tela ouve sempre o longo. Ícones: `checkmark.circle` (dentro), seta para cima / para baixo (acima / abaixo), `minus.circle` (sem faixa).

### StateLine
- A forma de linha do estado: ícone de 18 pt na tinta da divisória + `body` em `textSecondary`, com o valor em `bodyStrong` tabular antes ("↑ **138 mg/dL**, acima da faixa do laudo"). O ícone cresce com o texto até 2×. Um único elemento para o leitor de tela.

### Cards / Containers
- **Não há cartões na folha.** `ListSection` e `ListItem` não têm fundo, raio nem borda: só o fio `border` embaixo de cada linha. Agrupamento é por `SectionHeader` (20 pt Bold, com um fio fino ao lado do título até a ação, como o índice de um manual; a ação vai em `subheadline` 600 na tinta da divisória).

### Inputs / Fields
- **Style:** fundo `surface`, contorno de 1 pt `borderStrong`, canto `field`, altura 52 (120 em multilinha), 16 pt de respiro, `body` em Archivo Regular.
- **Focus:** contorno de 2 pt em `primary` (o respiro diminui 1 pt para o texto não pular).
- **Error:** contorno de 2 pt em `danger`, mensagem embaixo com ícone.
- **Disabled:** fundo `surfaceSunken`.

### Navigation
- Tab bar nativa (`NativeTabs`): Família e Ajustes, com a busca no papel de pesquisa do iOS 26, `tintColor` = `primary`. Pilha com o voltar do sistema. No painel Família não há cabeçalho; na pessoa, `headerOptions(theme, { board })` dá cabeçalho opaco no `board`, título e botões em `onBoard`, título em Archivo. Fluxos de captura e formulários em `formSheet`, na folha simples (sem divisória).

### DividerBoard + Leaf (assinatura)
- `DividerBoard` pinta o `board` atrás da tela inteira, põe a régua à direita (ou no topo com texto ≥ 1,35×) e aplica `HueProvider`, para que botão, link, gráfico e régua do laudo fiquem na tinta da pessoa. `Leaf` é a folha: `leaf` do matiz, canto superior direito de 16, sombra "Folha pousada" no invólucro (o `overflow` do conteúdo não a corta), 3 furos e o conteúdo recuado da margem dos furos. `Screen board` monta os dois.
- **Troca de divisória:** a capa, o papel e o conteúdo trocam no mesmo quadro; nunca há um quadro com a cor nova e o conteúdo antigo. O movimento fica na aba, que sai 5 pt de trás da folha em `boardSwap.tab` (120 ms, `easing.out`, só transform), e no conteúdo da folha, que entra em `boardSwap.content` (150 ms de opacidade). Sem crossfade de cor nem mola. Com Reduzir movimento, instantânea. Família e pessoa são a mesma tela: a troca é estado, nunca push, e o título fica no mesmo lugar.

### TabRail
- Uma aba por pessoa na cor dela (`tab`/`onTab`), 40 pt com 5 pt recolhidos atrás da folha (35 visíveis); a aba atual sai até a borda, sem raio nem sombra, e se funde à divisória. Altura fixa: todas as pessoas com a mesma (maior nome + linha da contagem, mínimo 64 pt); a aba "Família" (sem contagem) fica do tamanho do nome. A seleção nunca muda a altura, para a régua não se reorganizar. Rótulo `subheadline` girado 90° (de cima para baixo), 600 (700 na atual), com a contagem tabular no pé da aba, também na atual. 6 pt entre abas. Leitor de tela: "Carlos, 6 documentos", com estado selecionado; toque ≥ 44/48 por `hitSlop`; háptico de seleção ao trocar.

### TabMark
- O pedacinho da divisória ao lado de uma linha ("Carlos · Glicose em jejum"): 10 × 14 pt no `tab` da pessoa, cantos direitos de 4. Decorativa; o nome vai sempre escrito.

### RangeBar (a régua do laudo)
- Trilho de 4 pt em `rangeTrack` (112 pt de largura padrão, ou a largura do pai), faixa do laudo em `rangeBand` (o `soft` da divisória), marcador de 12 pt em `primary` com anel de 2 pt na cor da folha. Domínio = faixa ± 60% da largura dela, ampliado até 3× para caber o valor. Sem faixa numérica: trilho tracejado (6/4), sem marcador. O marcador assenta do centro da faixa até o valor uma vez (300 ms, `easing.out`); com Reduzir movimento, aparece no lugar. O estado não pinta a régua: quem diz é o `StateChip`.

### TrendChart
- Linha e pontos na tinta da pessoa; o estado de cada ponto é a forma (círculo dentro, triângulo para cima acima, para baixo abaixo), vazada, e só o último ponto vai cheio com o valor escrito. Banda do laudo em `rangeBand` só quando todos os pontos têm a mesma faixa. Eixos em Archivo 12 pt tabular, altura 196 (240 em AX3+). Sempre com resumo textual visível e a lista completa de resultados.

### Iconography
SF Symbols (iOS) e Material Symbols (Android) via `expo-symbols`, traço único, nunca emoji. Ícone de estado na tinta da divisória (`StateLine`) ou no `on*Soft` (`StateChip`), crescendo com o texto até 2×. Nomes semânticos:

| Semântico | SF Symbol | Material Symbol |
|---|---|---|
| `stateIn` | `checkmark.circle` | `check_circle` |
| `stateHigh` | `arrow.up` | `arrow_upward` |
| `stateLow` | `arrow.down` | `arrow_downward` |
| `stateNone` | `minus.circle` | `do_not_disturb_on` |
| `clock` | `clock` | `schedule` |
| `trend` | `chart.xyaxis.line` | `monitoring` |
| `bloodPressure` | `heart` | `ecg_heart` |
| `glucose` | `drop` | `water_drop` |
| `weight` | `scalemass` | `monitor_weight` |
| `height` | `ruler` | `height` |
| `pills` | `pills` | `medication` |
| `scanDocument` | `doc.text.viewfinder` | `document_scanner` |
| `privacy` | `lock` | `lock` |
| `edit` | `pencil` | `edit` |

## Do's and Don'ts

### Do:
- **Do** pôr toda tela de pessoa em `Screen board={theme.personBoard(categoricalIndexFor(id))}` com `headerOptions(theme, { board })`, e o painel Família em `board="ultramar"` com a `TabRail`.
- **Do** escrever o estado com ícone e palavras do vocabulário fixo ("dentro / acima / abaixo da faixa do laudo", "sem faixa no laudo"), via `StateLine` ou `StateChip`.
- **Do** usar `ink` do matiz para texto e traço sobre a folha e `onBoard` sobre a divisória; conferir todo par novo em `tokens.test.ts` (texto ≥ 4,5:1, UI ≥ 3:1).
- **Do** manter conteúdo em linhas com fio fino sobre a folha, agrupadas por `SectionHeader`.
- **Do** trocar de divisória por estado na mesma tela, com capa, papel e conteúdo no mesmo quadro, e cortar para instantâneo com Reduzir movimento.
- **Do** levar formulários, login, consentimento, Ajustes e Buscar na folha simples (`background`), sem divisória.

### Don't:
- **Don't** usar o matiz de uma pessoa para tipo de registro, estado clínico, sucesso ou aviso.
- **Don't** usar `danger` para valor fora da faixa do laudo, nem escrever "normal".
- **Don't** pôr cartões brancos com sombra sobre a folha, nem agrupar conteúdo em caixas com fundo próprio.
- **Don't** usar serifa, sálvia ou o papel creme neutro do mundo "Cuidado sereno" como fundo de tela. O leve tom quente da folha sobre cromo ou óxido vem da divisória e é do mundo.
- **Don't** pôr gradiente ou vidro decorativo; vidro só onde o sistema já aplica.
- **Don't** voltar os furos de fichário nem tingir o papel por pessoa: custam largura, leem como marcador e fazem a área maior da tela piscar na troca.
- **Don't** criar tamanhos de texto fora de 34, 30, 20, 17, 15 e 13, nem texto legível abaixo de 13 pt.
- **Don't** deixar a régua de abas como único caminho para uma pessoa.
