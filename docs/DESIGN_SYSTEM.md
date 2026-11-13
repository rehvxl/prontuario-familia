# Design System — Prontuário da Família (v4 · "Pasta com divisórias")

> **v4 substitui o mundo visual da v3 ("Cuidado sereno": serifa New York, sálvia e papel creme), rejeitado pelo Douglas por parecer entrega genérica.** Direção escolhida pelo Douglas numa rodada do Impeccable em 11/11/2026: contrato em [`.impeccable/surfaces/src-screens-family-home.md`](../.impeccable/surfaces/src-screens-family-home.md), esboço da primeira tela em [`.impeccable/mocks/decision/challenger-pasta.html`](../.impeccable/mocks/decision/challenger-pasta.html).
> Status: **implementado no `src/shared/ui`** (tokens, tema, componentes, catálogo). As telas em `src/screens` adotam `Screen board`/`TabRail` nas fatias delas. A §13 (correções técnicas de folha nativa, título, `trailing`, véu, rodapé flutuante) continua valendo.

O código fica em `src/shared/ui` e é importado de `@/shared/ui`. Tokens em `src/shared/ui/tokens`, tema em `src/shared/ui/theme`, componentes em `src/shared/ui/components`. Componentes que conhecem o domínio (vacina, medicamento, medida, OCR) ficam na entity/feature (`docs/ARCHITECTURE.md` §2).

Legenda: **[v4]** novo ou alterado nesta versão · **[v3]** e **[mantido]** continuam valendo · ~~riscado~~ substituído.

---

## 1. Direção [v4]

**A família é uma pasta com divisórias.** Cada pessoa é uma divisória de cor plena; os documentos e os dados dela são folhas por cima; a borda direita mostra a pasta inteira em abas. É como a Ana já guarda os papéis.

- **Estrutura nativa, mundo próprio.** Pilha, abas (NativeTabs), sheets, menus, `Switch`, `Select` e `SegmentedControl` continuam os do sistema. O mundo empresta só tipo, paleta, densidade e o movimento-assinatura. **[mantido]**
- **Divisórias de matiz pleno:** ultramar para a família; óxido, cromo, grama, petróleo, violeta, siena e oliva para as pessoas (`personBoard(categoricalIndexFor(id))`; o matiz segue a ordem de cadastro na família via `registerPersonHues`, igual em qualquer aparelho, e cai no hash do id só para quem não está registrado).
- **Folha leitosa**: papel de tom fixo em toda a pasta (`hue.leaf` = `#EEF0F9`, 8% do ultramar; escuro: grafite `#1E2029`), pousada sobre a cor com sombra suave no alto e à direita (as abas saem de trás dela), sem furos (saíram na crítica de 12/11/2026: custavam 14 pt de largura e liam como botão de rádio). Telas sem divisória continuam em `background` `#F3F4F8`. Conteúdo em fios finos, sem cartões flutuantes. **[revisão final, 11/11/2026]**
- **Tinta** `#141833` / `#474C6B` (escuro `#ECEEF5` / `#B9BDCF`). `primary` = tinta da divisória atual (botão cheio, FAB, link, gráfico, faixa do laudo).
- **Um corpo só:** Archivo SemiCondensed 17 pt faz quase tudo; hierarquia por peso e pela cor da divisória. Sem serifa em lugar nenhum. ~~New York 600~~.
- **Vermelhão** `#BF1F2F` só para erro e ação destrutiva. **Estados clínicos** em tinta neutra + ícone + texto: nunca a cor de uma pessoa, nunca vermelho, nunca "normal".
- **Movimento-assinatura:** Troca de divisória no mesmo quadro (capa, papel e conteúdo juntos): a aba sai de trás da folha em 120 ms e o conteúdo entra em 150 ms de opacidade; instantânea com Reduzir movimento. **[crítica 12/11/2026]**
- **Proibido:** serifa, creme, sálvia, monoespaçada em rótulos, gradientes e vidro decorativos.

## 2. Uso [v4]

```tsx
// src/app/_layout.tsx — igual à v3. O UiProvider também carrega a Archivo no Expo Go (useFonts).
<UiProvider /* scheme="system" | "light" | "dark" */>
  <Stack screenOptions={headerOptions(theme)} />
</UiProvider>

// Tela de uma pessoa: cabeçalho e fundo na divisória dela, conteúdo na folha, régua à direita.
const hue = theme.personBoard(categoricalIndexFor(member.id));
<Stack.Screen options={headerOptions(theme, { board: hue })} />
<Screen board={hue} rail={<TabRail items={tabs} onSelect={goTo} />} heading={{ title: member.fullName }}>…</Screen>
```

`useTheme()` mantém tudo da v3 e ganha **[v4]**:

- `theme.hue` (divisória atual), `theme.hues.{family, people, byName}`, `theme.personBoard(index)`.
- `theme.font(weight)` → `'ArchivoSC-Regular' | 'ArchivoSC-Medium' | 'ArchivoSC-SemiBold' | 'ArchivoSC-Bold'` (ou a fonte do sistema com `fontsLoaded: false`) e `theme.fontsLoaded`.
- `theme.motion.boardSwap` (`{ tab: 120, content: 150 }`).
- `withHue(theme, hue)` e `<HueProvider hue>`: o mesmo tema com `primary*`, `focusRing`, `rangeBand` e `native.tint` na tinta da pessoa. `DividerBoard` e `Screen board` já aplicam.
- `onLeaf(theme)` e `<HueProvider hue leaf>`: dentro da folha, `colors.background` (e `native.background`) vira `hue.leaf`, para os pontos vazados do gráfico, o véu e o marcador da régua casarem com a folha tingida. A `Leaf` já aplica.
- `headerOptions(theme, { board })`: cabeçalho opaco na cor plena, título e botões em `onBoard`, Archivo no título. `headerTitleStyles(theme, hue?)` = cor + fonte do título (`headerTitleColors` continua só cor).
- `HueTokens` por matiz: `board`, `onBoard`, `tab`, `onTab`, `ink`, `inkPressed`, `onInk`, `soft`, `leaf` (o papel da pasta, igual em todas as divisórias), `statusBar`. `mixHex(a, b, t)` faz a mistura.
- `theme.categorical`: índices 0..6 = tinta das pessoas (`main` = `ink`); **7 = `NEUTRAL_CATEGORICAL`** (tinta neutra, para tipos de registro).

### 2.1 Contraste verificado [v4]

Todos os pares abaixo, e os demais da tabela de `tokens.test.ts` (texto ≥ 4,5:1, UI ≥ 3:1, `soft`/`rangeBand` decorativos < 3:1), passam nos dois temas (0 falhas).

| Par | Claro | Escuro |
|---|---|---|
| textPrimary / folha | 15,81 | 14,00 |
| textSecondary / folha | 7,60 | 8,69 |
| textTertiary / afundado | 5,34 | 5,32 |
| clinicalIn / folha | 9,34 | 10,15 |
| clinicalNone / folha | 5,94 | 6,79 |
| danger / folha | 5,53 | 7,11 |
| onDanger / danger | 6,08 | 8,11 |
| borderStrong / surface (UI) | 3,79 | 3,84 |

**Folha tingida (`hue.leaf`, claro).** `tokens.test.ts` confere, em cada uma das 8 folhas, texto primário/secundário/terciário, estados clínicos, aviso, vermelhão e a tinta de **todas** as pessoas ≥ 4,5:1, e `borderStrong` ≥ 3:1. Piores casos: textTertiary 5,74 (ultramar `#EEF0F9`), danger 5,35 (ultramar), tinta de outra pessoa 5,64 (óxido `#A83A0E` sobre ultramar). Na cromo `#FEF9EC`: textPrimary 16,53, textSecondary 7,95, textTertiary 6,21. No escuro a folha é `#1E2029` em toda divisória (mesmos valores da tabela).

| Matiz | onBoard/board (cl · esc) | onTab/tab (cl · esc) | ink/folha (cl · esc) | ink/soft (cl · esc) | onInk/ink (cl · esc) |
|---|---|---|---|---|---|
| ultramar `#2B3FB8` · `#1B2672` | 8,38 · 12,41 | 8,38 · 10,18 | 7,62 · 7,71 | 5,88 · 5,13 | 8,38 · 8,80 |
| oxido `#D9541E` · `#7A2A0A` | 4,80 · 8,99 | 4,80 · 5,59 | 5,83 · 7,92 | 4,78 · 5,28 | 6,41 · 9,03 |
| cromo `#F2B90F` · `#6B5000` | 10,75 · 7,01 | 10,75 · 6,57 | 5,93 · 9,85 | 5,47 · 6,15 | 6,51 · 11,24 |
| grama `#3E8E3A` · `#1F4F1D` | 4,71 · 8,86 | 4,71 · 5,66 | 5,88 · 8,70 | 4,92 · 5,61 | 6,47 · 9,92 |
| petroleo `#127A80` · `#0A4246` | 5,10 · 10,34 | 5,10 · 6,85 | 6,27 · 8,66 | 5,07 · 5,61 | 6,90 · 9,88 |
| violeta `#6B3FA0` · `#3A2160` | 7,38 · 12,41 | 7,38 · 9,25 | 6,72 · 7,76 | 5,27 · 5,12 | 7,38 · 8,86 |
| siena `#8A4B2A` · `#4E2814` | 6,73 · 11,87 | 6,73 · 8,51 | 6,12 · 7,67 | 4,85 · 5,12 | 6,73 · 8,75 |
| oliva `#7A8418` · `#3E4410` | 4,72 · 9,54 | 4,72 · 5,66 | 6,06 · 9,36 | 5,08 · 5,94 | 6,66 · 10,68 |

Leitura: no claro, óxido, cromo, grama e oliva levam tinta escura (`#100E0C`) sobre a cor; ultramar, petróleo, violeta e siena levam branco. No escuro, a divisória é o matiz profundo e a aba sobe um tom (`tab`) para aparecer sobre outra divisória.

## 3. Tipografia [v4]

Archivo SemiCondensed (OFL, `assets/fonts/Archivo-OFL.txt`), 4 arquivos estáticos. iOS usa o nome PostScript e Android o nome do arquivo, que aqui são iguais: `ArchivoSC-Regular` (400), `-Medium` (500), `-SemiBold` (600), `-Bold` (700).

- **Carga:** plugin do `expo-font` no `app.json` (embute no build; exige novo development build) e `useFonts` no `UiProvider` como fallback do Expo Go. Nunca bloqueia: até carregar, ou se falhar, `theme.font()` devolve a fonte do sistema.
- **`Text`** escolhe o arquivo pelo peso da variante ou do `style.fontWeight` do chamador. No Android tira o `fontWeight` do estilo (o arquivo já é o peso; somar os dois faz negrito sintético).
- **Escala (poucos tamanhos):** `largeTitle` 34/40 Bold (título de tela, na tinta da divisória) · `title1` 30/36 Bold (pessoa, detalhe) · `title2`/`title3` 20/26 Bold (seção) · `body`/`bodyStrong`/`headline`/`callout`/`label` 17/22 · `subheadline` 15/20 (apoio) · `footnote`/`caption` 13/18 (legenda) · `metricHero` 34 Bold tabular · `metric` 20 SemiBold tabular · `metricUnit` 15.
- **Numerais tabulares** (`fontVariant: ['tabular-nums']`) em métricas, datas da lista, contagem das abas e eixos do gráfico.
- **Cabeçalho nativo:** `headerTitleStyle.fontFamily` funciona no `react-native-screens` (nome real de fonte, diferente do `ui-serif` da v3). Botões SwiftUI usam `font({ family })` com `textStyle: 'headline'` para seguir o Dynamic Type.
- ~~§3 v3: serifa do sistema, `SERIF_WEIGHT`, `fontFamilySerif`~~ (removidos).

### 3.1 Pasta: quando usar divisória, folha e régua [v4]

| Situação | Use | Não use |
|---|---|---|
| Tela de uma pessoa (resumo, documentos, exames, vacinas, medicamentos, sinais vitais, tendência) | `Screen board={personBoard(i)}` + `headerOptions(theme, { board })` | Fundo simples |
| Painel da Família | `Screen board="ultramar"` + `TabRail` (Família estendida + uma aba por pessoa) | — |
| Raiz sem botões no cabeçalho (como no esboço) | `headerShown: false` + `Screen board edges={['top','left','right','bottom']}`: a folha começa logo abaixo da barra de status | Cabeçalho transparente sobre a folha (os botões em `onBoard` somem no branco) |
| Lista longa própria (FlatList/SectionList) | `DividerBoard` + `Leaf scroll={false}` e `contentContainerStyle={leafContentInset(theme)}` na lista | `Screen scroll` aninhado |
| Formulário em folha nativa (`presentation="sheet"`) | Folha simples (sem `board`): o `Screen` ignora `board` em sheets. Folha que nasce de uma pessoa (resultado, dose, medicamento, sinal vital) leva o filete de 4 pt na `hue.tab` dela; Novo registro e Nova pessoa não (a pessoa ainda não foi escolhida). O título é o nativo da rota: não repita em `Screen heading` | Divisória atrás de formulário; título duplicado |
| Fluxo de entrada (Boas-vindas, Consentimento, Entrar, Código, Criar família, Primeiras pessoas) e telas-raiz sem pessoa (Ajustes, Buscar) | `Screen board="ultramar"` (a família). Sem cabeçalho nativo e com `edges={['top', …]` quando a tela não tem voltar (Boas-vindas, Entrar, Criar família, Primeiras pessoas, Ajustes; faixa de cor de uma altura só), inclusive nos estados de carregamento e erro; com `headerOptions({ board })` onde há voltar ou título de busca (Consentimento, Código, Buscar). A régua em Boas-vindas e Primeiras pessoas é ilustrativa (progresso) e não aparece nas demais | Cabeçalho nativo vazio sobre a divisória |
| Trocar de pessoa | `TabRail` **e** a lista "Pessoas" (a régua nunca é o único caminho) | Só a régua |
| Item de lista de uma pessoa ("Carlos · Glicose") | `TabMark id={member.id}` + o nome escrito | Cor sozinha |
| Estado clínico numa linha | `StateLine state value` ou `StateChip` | Cor, vermelho ou "normal" |

**Troca de divisória:** `DividerBoard` troca a cor no mesmo render de `hue`. Família e pessoa vivem na mesma tela (`FamilyHomeScreen` + `MemberPanel`): a régua e a lista mudam o estado `selected`, nunca navegam; o título vai em `Screen heading` (com `trailing` para "Editar pessoa") e o conteúdo entra com o fade de `boardSwap.content`. `/(main)/member/[id]` só redireciona para `/(main)/(tabs)/(family)?member=<id>`.

**Régua em AX5:** com `fontScale ≥ 1,35` (`RAIL_STRIP_FONT_SCALE`), o `DividerBoard` põe a régua no topo como faixa horizontal rolável. Até lá, o rótulo vertical da aba cresce até 1,35×.

**Barra de status:** `hue.statusBar` diz o estilo ('light'/'dark') sobre a divisória; a tela aplica com `expo-status-bar` ou `statusBarStyle` do Stack.

---

## 4. Regras do Liquid Glass

1. **[mantido]** Somente `GlassSurface` (ou componentes que o usam). Não importe `GlassView` em telas.
2. **[v3]** Vidro só onde o sistema já aplica (barra de abas, cabeçalho transparente, sheets nativas) e em `GlassSurface` sobre imagem (`IconButton variant="glass"` no visualizador de anexo). FAB, `Banner appearance="floating"` e rodapé são sólidos (tinta da divisória e `surfaceRaised` + sombra "Flutuante"). **[v4]** Sobre uma divisória, o cabeçalho é opaco na cor dela (`headerOptions({ board })`), sem vidro.
3. **[mantido]** Nunca `opacity < 1` em um GlassView nem em ancestral. Para esconder, desmonte.
4. **[mantido]** Fallback obrigatório com `theme.glass.enabled === false`: superfície sólida `surfaceRaised`, mesmo tamanho, texto e contraste.
5. **[mantido]** Texto sobre vidro em `textPrimary` ou `primary` (tinta da divisória) com peso ≥ 600.
6. **[mantido]** Não ponha `GlassSurface` por trás do cabeçalho ou da barra de abas.

## 5. Plataformas e fallbacks

| Componente | iOS 26 | Android | Observação |
|---|---|---|---|
| Button | **[v4]** SwiftUI `borderedProminent` com tint = tinta da divisória (filled), `bordered` (tonal `soft`), `plain`; rótulo em Archivo SemiBold (`font({ family, textStyle: 'headline' })`); `glass*` só sobre imagem | M3 filled / tonal / text na tinta da divisória | iOS < 26 igual |
| FloatingActionButton | **[v4]** SwiftUI `borderedProminent` sólido na tinta da divisória, cápsula, sombra "Flutuante" | FAB M3 estendido, tinta da divisória, raio 16 | ~~SwiftUI glassProminent~~ |
| Menu / ContextMenu | **[mantido]** SwiftUI `Menu` / `contextMenu` | Compose `DropdownMenu` | — |
| Select | **[mantido]** Menu nativo com marca | `SelectSheet` | — |
| SegmentedControl | **[mantido]** `Picker(.segmented)`; segmento escolhido na folha (`surface`), como no Android. O texto do segmento é o `label` do sistema: sobre a tinta da pessoa ficaria em ~3,2:1 (preto sobre cromo `#7A5800`) | Trilho `surfaceSunken`, escolhido em `surface` + check | — |
| Switch | **[mantido]** `UISwitch`, tint = tinta da divisória | Switch M3 | — |
| TabRail | **[v4]** RN (`tablist`/`tab` com `selected`), rótulo vertical; faixa no topo com texto ≥ 1,35× | igual | Não é navegação do sistema: é um trocador de pessoa dentro da tela; a tab bar continua nativa |
| ActionSheet / BottomSheet | **[mantido]** | **[mantido]** | Sheet de captura e de medida usam `formSheet` (ver §13.1/§13.2) |
| Gráficos (Sparkline, TrendChart, RangeBar) | **[v3]** `react-native-svg` (15.16.0, já instalado) | igual | Sem biblioteca de gráfico nova |
| OCR | **[v3]** módulo Expo local (`modules/`) com Vision + PDFKit | ML Kit Text Recognition | Expo Go / web: preenchimento manual. Modo demo: texto simulado |
| Ícones | SF Symbols | Material Symbols | `expo-symbols`; tabela de nomes novos no `DESIGN.md` |
| Vidro | `GlassView` | Sólido | §4 |

**[mantido]** Em Jest (plataforma iOS), botões SwiftUI não recebem `press`: use `fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } })`.

---

## 6. Componentes

Especificação visual completa, props e anatomia: `DESIGN.md` › Components. Resumo para quem implementa:

### Novos [v4]
| Componente | Props principais | Notas |
|---|---|---|
| `DividerBoard` | `hue`, `children`, `rail?`, `edges?` | Fundo de cor plena + régua à direita (ou no topo com texto ≥ 1,35×). Envolve os filhos em `HueProvider`. Troca de `hue` com troca no mesmo quadro de `hue` |
| `Leaf` / `leafContentInset(theme)` | `children`, `scroll?` (padrão true), `contentContainerStyle?`, `scrollViewProps?` | Folha `hue.leaf`, canto superior direito 16, borda pousada (`boxShadow: 2px -1px 6px`, no invólucro para o `overflow` não cortar; o `DividerBoard` põe a folha acima da régua). Sem furos. Margem de texto 20 pt à esquerda e 12 pt à direita. Os filhos recebem `colors.background` = `hue.leaf`. `scroll={false}` para FlatList própria |
| `TabRail` | `items: { id, label, count?, hue, selected?, accessibilityLabel? }[]`, `onSelect(id)`, `accessibilityLabel?` | Altura fixa (`tabHeights`): pessoas iguais (maior nome + contagem, mínimo 64 pt), Família do tamanho do nome (8 pt por letra + 18, × fontScale até 1,35); a seleção não muda a altura. Contagem escrita **também na aba atual**. A não selecionada fica 5 pt atrás da folha; a atual sai em 120 ms (`boardSwap.tab`). Estendida até a borda e na cor da divisória, sem sombra própria (a sombra da folha cai sobre a régua). Toque ≥ 44/48 com `hitSlop`. Lida "Carlos, 6 documentos" |
| `TabMark` | `id?` ou `hue?`, `size?: 'sm' \| 'md'` | Marca de aba 10 × 14 na cor da pessoa, decorativa (o nome vai escrito ao lado) |
| `StateLine` | `state?`, `value?`, `text?`, `icon?` | "↑ **138 mg/dL**, acima da faixa do laudo": ícone na tinta da divisória + texto; um elemento para o leitor de tela. O ícone cresce com o texto (`scaleWithText`, até 2×) |
| `HueProvider` / `withHue` | `hue` | Divisória para um trecho da árvore (ex.: FAB fora do `DividerBoard`) |
| `Screen` `board` / `rail` | `board?: HueName \| HueTokens`, `rail?: ReactNode` | Monta `DividerBoard` + `Leaf` mantendo `heading`, `footer`, teclado e `useFloatingFooterInset`; sem véu (a folha recorta). Ignorado com `presentation="sheet"` |

### Alterados [v4]
| Componente | Muda | Compatibilidade |
|---|---|---|
| `Text` | Archivo por peso (`theme.font`), inclusive com `style.fontWeight`; Android sem `fontWeight` | Visual |
| `Button` / `FloatingActionButton` | Tinta da divisória atual (`primary`); Archivo no rótulo SwiftUI | Visual |
| `ListSection` / `ListItem` | Sem cartão: sem fundo, raio nem borda; fio fino embaixo de cada linha; dentro da seção a linha alinha à coluna de texto (sem recuo de 16). `separatorInset` aceito e ignorado | Visual |
| `SectionHeader` | 20 pt Bold, ação na tinta da divisória; fio fino (`border`, hairline) ao lado do título até a ação, como o índice do manual; em AX3+ o fio sai | Visual |
| `AttentionList` | Linhas da folha: `TabMark` da pessoa, título em 17 SemiBold, `meta` (data) à direita, ícone do estado na tinta da divisória + detalhe. Novos campos opcionais `personId?`, `hue?`, `meta?`; `tone` não pinta | Aditivo |
| `RangeBar` | Faixa no `soft` da divisória, marcador na tinta da pessoa; `state` não pinta (o texto diz) | Visual |
| `TrendChart` / `Sparkline` | Linha, pontos e bordas da faixa na tinta da pessoa; estado pela forma do ponto; eixos em Archivo. Legenda fiel ao desenho: cada estado presente com a forma **vazada** (como os pontos) e uma entrada "Cheio: último resultado" (`TREND_LAST_LEGEND`) com a forma do último ponto preenchida | Visual |
| `StateChip` / `Badge` / `DemoBadge` | Tons clínicos neutros; `DemoBadge` no `soft` da divisória, inline | Visual |
| `Chip` / `FilterChip` / `SegmentedControl` | Selecionado no `soft` da divisória + check | Visual |
| `Avatar` | Capa da pessoa: cor plena `board`, iniciais Bold em `onBoard`, cantos de aba à direita. `ring` aceito e ignorado | Visual |
| `headerOptions` | `board?`; fonte Archivo no título | Aditivo |
| `TextField` / `SearchField` / `SuggestedField` | Archivo Regular no campo | Visual |
| `Icon` | `stateHigh`/`stateLow` viram setas soltas; novo `clock`. `scaleWithText?`: o tamanho segue o `fontScale` do sistema até 2× (`useIconScale`, `ICON_FONT_SCALE_CAP`), como um SF Symbol inline; ligado em `StateLine`, `AttentionList` e `StateChip`. Em AX5 o ícone de estado vai de 18 a 36 pt | Visual + aditivo |
| `categoricalIndexFor` | Devolve `PersonHueIndex` (0..6) | Compatível com `CategoricalIndex` |

### Novos [v3]
| Componente | Camada | Props principais | Notas |
|---|---|---|---|
| `SectionHeader` | shared/ui | `title`, `action?: { label, onPress }`, `level?: 'section' \| 'month'` | `title3`, cabeçalho para leitor de tela |
| `MetricValue` | shared/ui | `value`, `value2?`, `unit`, `unitSpoken?`, `state?: ReferenceState`, `size?: 'hero' \| 'row' \| 'compact'`, `showStateLabel?` | Recebe strings já formatadas em pt-BR. Um elemento de acessibilidade |
| `StateChip` | shared/ui | `state`, `variant?: 'short' \| 'long'` | Ícone + texto, nunca só cor |
| `RangeBar` | shared/ui | `value`, `range: { low?, high?, text? }`, `state`, `width?`, `animated?` | Assinatura. Decorativa para o leitor de tela |
| `SummaryCard` / `StatTile` | shared/ui | `title?`, `children`, `footer?` / `value`, `label` | Grupo com fio; tiles separados por fio vertical |
| `Sparkline` | shared/ui | `series: number[][]`, `width?`, `height?`, `summary` (obrigatório) | Sem faixa (sinais vitais) |
| `TrendChart` | shared/ui | `points[]`, `unit`, `yDomain?`, `summary` (obrigatório), `onPointPress?` | Resumo visível + tabela ao lado |
| `AttentionList` | shared/ui | `items[]` (`icon`, `tone`, `title`, `detail`, `onPress`), `max?`, `onSeeAll?`, `footer?` | Vazio: não renderiza |
| `SuggestedField` | shared/ui | `label`, `value`, `onChange`, `origin`, `confidence?`, `sourceHint?` (trecho lido), `required?` | Base do `OcrReviewField` |
| `ProgressSteps` | shared/ui | `progress: 0..1`, `label`, `liveRegion?` | Base do `ScanProgress` |
| `MemberAvatar` | entities/member/ui | `member`, `size`, `ring?`, `status?` | Usa `Avatar ring` |
| `VaccineStatusRow` | entities/vaccine/ui | `vaccineName`, `status` (`late \| due \| confirm \| next \| planned \| noRecord \| applied \| notApplicable`), `detail`, `doses?`, `onPress?` | Textos de status da spec; atrasada em ocre, nunca vermelho |
| `MedicationRow` | entities/medication/ui | `name`, `dosage?`, `instructions?`, `startOn`, `endOn`, `status`, `origin` | Status pela R5 no domínio; origem S5 |
| `MeasurementRow` | entities/measurement/ui | `measurement`, `origin: string`, `label?` (ex. "Hemoglobina glicada · Carlos"), `onPress` | Compõe `MetricValue` + `RangeBar` + "Faixa do laudo: …". A origem (S5) chega pronta: a entity não conhece o título do registro |
| `VitalEntryForm` | features/add-measurement/ui | `memberId`, `kind?`, `onSaved` | Valida digitação plausível, nunca normalidade |
| `OcrReviewField` / `OcrReviewList` | widgets/document-review | campo com selo "Sugestão" / grupos de itens com checkbox | Itens começam desmarcados (S4); trecho lido visível |
| `ScanProgress` | features/read-document/ui | `current`, `total`, `thumbnailUri?`, `onSkip` | "Lendo o documento…", "Pular leitura", limite de 20 s; progresso por arquivo |

`ReferenceState = 'in' | 'high' | 'low' | 'none'` e `Confidence = 'high' | 'medium' | 'low'` são tipos de `shared/ui` (genéricos). O cálculo do estado a partir da faixa é `computeFlag` de `entities/measurement/domain`, que devolve `ReferenceFlag` com os mesmos literais (o domínio não importa `shared/ui`).

### Alterados [v3]
| Componente | Muda | Compatibilidade |
|---|---|---|
| `Card` | raio 16, fio `border`, sem sombra; `accent` deprecado (no-op); `tone?: 'default' \| 'tinted'` | API mantida |
| `ListSection` | raio 16, fio 1 pt; `header` string usa `SectionHeader` | API mantida |
| `ListItem` | `leading` em tile 36 pt raio 10; `meta` tabular; nova prop `value?: ReactNode` | Aditivo |
| `Button` | iOS `filled` → `borderedProminent` tint `care`; `bordered` → tonal `careSoft` | Visual |
| `FloatingActionButton` | sólido em todas as plataformas | Visual |
| `Badge` | tons clínicos; cápsula menor | Aditivo |
| `Chip` / `FilterChip` | contorno `borderStrong` / selecionado `careSoft` + check | Visual |
| `Avatar` | `ring?`; iniciais `main` sobre `soft` | Visual + aditivo |
| `Screen` | fundo `paper`; `heading?: { title, subtitle? }` | Aditivo |
| `Banner` | `floating` sólido | Visual |
| `Icon` | nomes semânticos novos (tabela no `DESIGN.md`) | Aditivo |
| `headerOptions` | `contentTitle?`; fundo `paper`; Android título serifado | Aditivo |
| `Text` | aplica `fontFamily` serifa nas variantes de título | Visual |

Os demais (`TextField`, `SearchField`, `OtpInput`, `DateField`, `Select`, `Switch`, `Checkbox`, `Menu`, `IconButton`, `BottomSheet`, `ActionSheet`, `ConfirmSheet`, `EmptyState`, `Skeleton`, `Spinner`, `Divider`) só herdam os tokens novos (raio de campo 12, cores).

---

## 7. Composição das telas [v3 + v4]

Comportamento, critérios de aceite e copy dos avisos (A1–A15) são da spec [`docs/features/v0.2-saude-da-familia.md`](features/v0.2-saude-da-familia.md), definida pela Head de Produto. Esta seção diz **como cada tela se organiza visualmente**; quando houver conflito, vale a spec. Rotas conforme a §9 da spec (revisada em 11/11/2026: sem rota `record/review`).

> Revisão de consistência (11/11/2026): saíram desta versão, por estarem fora da spec v0.2, "Últimos resultados" e o mini-resumo por pessoa na Família, a linha "exames no acompanhamento" na linha do tempo, séries de exame na Busca, "Compartilhar com médico" e "editar" no detalhe do registro, e "Face ID" e "Quem vê a família" nos Ajustes. O protótipo ainda mostra os dois primeiros; vale este texto. Qualquer um deles volta como P2 com decisão da Head de Produto.

### 7.0 Contrato de direção [v4]
Lei: [`.impeccable/surfaces/src-screens-family-home.md`](../.impeccable/surfaces/src-screens-family-home.md). Resumo:
- **THESIS:** a família é uma pasta com divisórias. Cada pessoa é uma divisória de cor plena, e os documentos e os dados dela são folhas por cima. Recusa os cartões brancos agrupados com um acento único (o padrão do app Saúde) e o editorial creme com serifa.
- **OWN-WORLD:** divisórias ultramar (família), óxido, cromo, grama, petróleo, violeta, siena (e oliva, 7.º matiz); vermelhão só para erro e destrutivo; folha leitosa sem furos; Archivo SemiCondensed num corpo de 17 pt; todo estado com ícone e texto; tab bar, folhas e menus nativos.
- **STORY:** a Ana abre a pasta da família e vê o que acompanhar. Toca a aba do Carlos, e a pasta abre na divisória dele, com resumo, exames, vacinas, medicamentos e documentos.
- **FIRST VIEWPORT (Família):** capa ultramar no fundo; à esquerda, a folha (≈ 88% da largura) com "Família Souza", a data, "Para acompanhar" (com a marca de aba de cada pessoa) e "Pessoas"; na borda direita, a régua de abas (Família estendida + uma aba por pessoa, altura proporcional aos documentos, contagem escrita); embaixo, "Novo registro" e a tab bar nativa. Referência: `Catalog screen="home"`.
- **FORM:** Pasta com divisórias (catálogo `rw-manual-acetate-tab-board`), escolhida pelo Douglas em 11/11/2026, seed `3b0950cc2d020c3e`. Assinatura: troca de divisória com passo seco de troca atômica com aba de 120 ms e fade de 150 ms do conteúdo (revista em 12/11/2026); instantânea com Reduzir movimento.
- **Em aberto (validar no aparelho):** tema escuro (divisória profunda, folha grafite) e a régua como faixa no topo acima de 1,35×.
- **FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

### 7.1 Regras comuns
- **Ordem de foco** = ordem visual: cabeçalho (voltar, título curto, ações) → título → seções (cabeçalho, depois linhas, depois rodapé) → FAB → barra de abas.
- **Carregando:** skeleton no formato do conteúdo (linhas de 52 pt, régua em `rangeTrack`), por seção; "Carregando…" só para o leitor de tela.
- **Erro:** por seção, sem derrubar as outras (`LoadErrorState` com o texto da spec e "Tentar de novo").
- **Offline:** `Banner floating` sólido "Sem conexão · mostrando o que já está salvo".
- **Demo:** `<DemoBadge />` (cápsula "Modo demonstração", `caption`, `soft` da divisória), como primeiro filho do `Screen`, logo abaixo do título. Nunca flutuante: a pílula sobre a lista roubava toques (§13.3). Na revisão do OCR, a A8.
- **AX5:** linhas lado a lado empilham (rótulo em cima, valor embaixo); `RangeBar width="fill"`; FAB compacto (só ícone, rótulo mantido para acessibilidade); `StatTile` empilha; `MetricValue` nunca trunca (sem `numberOfLines`); o avatar grande do topo da Pessoa some.
- **Adicionar:** em lista de uma pessoa (Exames, Vacinas, Medicamentos, Sinais vitais), botão "+" na barra (`Stack.Toolbar.Button`, ícone `TOOLBAR_ICONS.add`, rótulo acessível "Adicionar …"/"Registrar …"). O botão flutuante é só de "Novo registro" (Família e Pessoa), que cria um documento. Dentro de uma seção de uma tela de detalhe (Série do exame), a ação fica no `SectionHeader`.
- **Excluir:** o objeto da tela (registro, pessoa) → menu "…" na barra com ação destrutiva; item de lista (dose, resultado) → folha de ações aberta ao tocar na linha; detalhe completo em folha (medicamento) → botão destrutivo `ghost` no fim. Toda exclusão termina em `ConfirmSheet`.
- **Linha de lista que abre algo** leva chevron, sem menu "…" por linha (a Família abre a pessoa, e "Novo registro" e "Editar pessoa" vivem na tela dela).
- **Carregando:** lista ou seção → skeleton; tela de um objeto (registro, pessoa, resultado) e folhas → `Spinner fill` "Carregando", já na divisória da pessoa quando o id vem da rota.
- **Rodapés obrigatórios** (texto exato da spec): A1 em telas com exames, A3 + A13 em vacinas, A4 em sinais vitais, A5 em medicamentos. Um por tela, no fim da seção correspondente, `footnote` `textSecondary`.
- **Origem** (S5) em todo item estruturado, 13 pt: "28 de out. de 2026 · do laudo Laboratório Vida", "Do documento {título}, {data}" ou "Registrado por você".

### 7.2 Família — painel coletivo (F7)
Rota `(tabs)/(family)/index`.
1. **[v4]** `Screen board="ultramar"` com `TabRail` (Família estendida + uma aba por pessoa, contagem de documentos). Sem botões no cabeçalho: `headerShown: false` e a folha logo abaixo da barra de status; com "…", `headerOptions({ board: 'ultramar', contentTitle: true })`.
2. `Screen heading`: "Família Souza" (`largeTitle` na tinta ultramar) + data de hoje por extenso.
3. **Para acompanhar** (`AttentionList`, até 5, "Ver todos (n)"): um item por coisa, com `personId` (marca de aba da pessoa), no formato "{Primeiro nome} · {o quê}", `meta` com a data e o estado em ícone + texto no detalhe. Ordem por tipo e data (F7.2), nunca por pessoa. Rodapé: "Vacinas: {x} de {y} pessoas em dia com o calendário." (com "{k} sem data de nascimento" quando houver, F7.4) e a A1.
4. **Pessoas**: `TabMark` da pessoa (ou `Avatar`, a capa na cor dela), nome, "Cônjuge · 67 anos · 6 documentos". Sem ordenação por "gravidade" (S9). Tocar abre a divisória da pessoa (mesmo destino da aba). ~~Mini-resumo por pessoa~~ (P2).
5. FAB "Novo registro". ~~Últimos resultados~~ (P2).

Estados: **sem dado de saúde** → "Para acompanhar" não aparece (a tela fica como no MVP); **nada pendente** → "Nada pendente pelo que está registrado no app." + A13; **família sem documentos** → `EmptyState` "Guarde o primeiro documento" com o FAB; **erro do resumo** → "Não foi possível montar o resumo da família." + "Tentar de novo", sem esconder Pessoas; carregando, demo e offline pela §7.1.
Acessibilidade: cada item de "Para acompanhar" é um botão com o rótulo completo ("Carlos, hemoglobina glicada, acima da faixa do laudo, 7,4 por cento, 28 de outubro"); linha de pessoa "Carlos Souza, cônjuge, 67 anos".

### 7.3 Pessoa — Resumo (F6) e Documentos
Rota `member/[id]/index`, `SegmentedControl` **"Resumo | Documentos"** (Resumo é o padrão; o segmento vai no parâmetro `?view=` para voltar ao mesmo lugar).
- **[v4]** `Screen board={personBoard(i)}` + `headerOptions({ board })` + `TabRail` (a aba da pessoa estendida); a troca entre pessoas é estado na mesma tela (§3.1), sem push.
- Topo: voltar + "…" (editar pessoa, excluir); `Avatar` (capa) 56 + nome (title1 na tinta da pessoa) + "Cônjuge · 67 anos · 9 documentos"; segmento.
- **Resumo**, na ordem da spec: **Vacinas** (uma linha: "Em dia com o calendário" ou "{n} pendências" + a primeira pendência com o status em texto) → **Exames recentes** (até 5 `MeasurementRow`, fora da faixa primeiro, depois por data; cada um abre a série) + A1 → **Medicamentos em uso** (até 5 `MedicationRow` com origem) → **Sinais vitais** (última pressão com `Sparkline`, última glicemia capilar com o momento, último peso e última altura, cada um com data e hora) + A4. Cada seção com "Ver tudo".
- **Documentos:** a linha do tempo do MVP sem mudança de comportamento, só no visual v3: `ChipGroup` (Tudo, Resultados, Consultas, Vacinas, Receitas, Laudos, Exames, Outros), meses em `SectionHeader level="month"`, um grupo por mês, linhas com coluna de data tabular (54 pt), tile do tipo (neutro: ícone, §8), rótulo do tipo em `caption`, título, local · profissional, e linha mini com o que o MVP já mostra ("1 anexo").
- FAB "Novo registro" com a pessoa pré-selecionada, nos dois segmentos.
Estados: **tudo vazio** → "Ainda não há dados de saúde de Carlos. Guarde um documento para começar."; **seção vazia** → frase curta + ação ("Adicionar resultado", "Registrar dose", "Adicionar medicamento", "Registrar sinal vital"); erro e carregando por seção; Documentos **vazio por filtro** → "Nenhuma consulta de Lia" + "Limpar filtro".
Acessibilidade: o segmento é `tablist`; ao trocar, o foco vai para o primeiro cabeçalho de seção; em AX5 o segmento ocupa a largura e a sparkline desce para baixo do valor.

### 7.4 Exames da pessoa (F2, lista de séries)
Rota `member/[id]/exams/index`. Título "Exames" + nome; lista de `MeasurementRow` por série (último valor, data, estado, régua), fora da faixa primeiro; ação "Adicionar resultado" no cabeçalho (sheet `measurement/new`: exame do catálogo com busca ou "Outro", valor, unidade sugerida e editável, faixa do laudo opcional, data, documento de origem opcional). Rodapé A1.
Estados: vazio → "Nenhum exame registrado. Adicione um resultado ou guarde um laudo para preencher automaticamente."; erro → "Não foi possível carregar os exames. Tentar de novo."; valor inválido no formulário → "Digite um número, por exemplo 13,2."

### 7.5 Tendência de um exame (F2)
Rota `member/[id]/exams/[series]`. Cabeçalho: voltar + título curto "Exame".
1. Título completo (title1) "Hemoglobina glicada" + "HbA1c · Carlos Souza".
2. Grupo **Agora**: `MetricValue size="hero"` ("7,4 %"), `StateChip long` (A2), `RangeBar width="fill"`, "Faixa do laudo: inferior a 5,7 %", origem.
3. **Evolução**: `TrendChart` com legenda e resumo visível no formato da spec. Banda só pela R4. Sem filtro de período nesta rodada (P2 na spec).
4. **Resultados**: lista completa (data tabular, valor, ícone + estado em texto oculto, origem, "Ver documento"); editar e excluir pelo detalhe do resultado (`ConfirmSheet`). Ação "Adicionar" no cabeçalho da seção.
5. Rodapé A1.
Estados: **1 resultado** → sem gráfico, "O gráfico aparece a partir do segundo resultado."; **outra unidade** → pontos fora do gráfico, na lista com "Unidade diferente, fora do gráfico"; **faixas diferentes** → sem banda, faixa por linha; **sem faixa** → estados "Sem faixa no laudo".
Acessibilidade: o gráfico é uma imagem com rótulo = resumo; a lista é a forma navegável; em AX5 o gráfico vai a 240 pt de altura com 3 marcas no eixo.

### 7.6 Detalhe do registro
Rota `record/[id]`. Cabeçalho: voltar + "…" (excluir com `ConfirmSheet` e a A15 quando houver itens ligados; compartilhar e editar ficam fora da v0.2). Conteúdo: `Badge` do tipo (cor + ícone + rótulo) → título (title1) → "Lia Souza · 12 de março de 2026". Se houver itens ligados: **Itens deste documento** (`MeasurementRow`, doses, medicamentos; cada um abre a sua tela) + A1. Depois **Dados** (`ListSection`: local, profissional, pedido por), **Anexos** (visualizador; `GlassSurface` só sobre a imagem), **Observações**, rodapé "Só quem é da família vê estes arquivos." ~~Botão "Compartilhar com médico"~~ (compartilhamento com profissional está fora da rodada, spec §11).
Estados: sem itens → a seção some; erro ao abrir anexo → `LoadErrorState` dentro do grupo de anexos.
Acessibilidade: título é o primeiro foco depois do voltar; anexo "Resultado.pdf, PDF, 240 KB, abrir".

### 7.7 Vacinas da pessoa (F3)
Rota `member/[id]/vaccines`. Título "Carteira de vacinas" + "Dirce Almeida · 74 anos"; faixa de `StatTile` (pendências · doses registradas · data não informada); seções na ordem da spec: **Pendências** (Atrasada pelo calendário → Pendente → Confirmar na carteira → Próxima) com A3 + A13 no rodapé → **Aplicadas** (mais recente primeiro; "Data não informada" por último) → **Calendário para a idade** (todas as regras automáticas da faixa com o status) → **Outras indicações do calendário** (regras não automáticas, só texto). Botão "+" na barra, "Registrar dose" (sheet `vaccine-dose/new`: vacina, dose — "1ª dose", "2ª dose", "Reforço", "Dose única", "Anual" —, data ou "Não sei a data", lote e local opcionais). Na pendência, "Não se aplica" (P1) pede o motivo e oferece "Desfazer".
Estados: vazio → "Nenhuma dose registrada. Registre as vacinas que já estão na carteira de Dirce."; sem nascimento → A12 + "Adicionar data de nascimento", sem pendências; parcial → doses sem data em "Data não informada".
Acessibilidade: "Influenza de 2026, pendente, anual para 60 anos ou mais, nenhuma dose registrada em 2026".

### 7.8 Medicamentos (F4)
Rota `member/[id]/medications`. Seções **Em uso**, **Começa em breve** e **Anteriores** (recolhida, "Mostrar 4 anteriores"); cada `MedicationRow` com origem. Ação "Adicionar" (sheet `medication/new`: nome, início, "Uso contínuo" / "Até {data}" / "Por {n} dias"); no detalhe, "Encerrar uso" com data (padrão hoje). Rodapé A5.
Estados: vazio → "Nenhum medicamento registrado. Guarde uma receita ou adicione manualmente."; erro de data → "A data de término precisa ser igual ou posterior ao início."
Acessibilidade: "Losartana 50 miligramas, 1 comprimido pela manhã, uso contínuo, do documento receita cardiologia".

### 7.9 Sinais vitais + registrar (F5)
Rota `member/[id]/vitals/[code]` + sheet `vital/new` (`formSheet`). Por tipo: último valor (`MetricValue row`), data e hora, série (pressão com duas linhas, sistólica e diastólica, sem banda e sem eixo de normalidade) e a lista com data e hora. Ação "Registrar sinal vital" → `VitalEntryForm`. Rodapé A4. Nada de dentro/fora de faixa nem IMC.
Estados: vazio → "Nenhuma medição registrada."; validação pela F5 (sistólica ≤ diastólica bloqueia; fora dos limites de digitação, A14 com "Salvar assim" / "Corrigir").
Acessibilidade: campos com rótulo e unidade ("Sistólica, em milímetros de mercúrio"); foco no primeiro campo ao abrir; teclado decimal; em AX3+ os dois campos de pressão empilham.

### 7.10 Novo registro: captura → leitura → revisão (F1)
Rota `record/new` (hoje `modal`; `formSheet` depois da validação da §13.2). Captura, leitura e revisão são **passos da mesma folha**, sem rota `record/review` (spec §9 revisada; `ocr-tecnico.md` §f).
1. **Captura:** pessoa (pré-selecionada quando vem da Pessoa) e três opções grandes — Câmera, Fotos, Arquivo PDF — mais "Preencher sem documento".
2. **Leitura** (`ScanProgress`): começa sozinha ao anexar; "Lendo o documento…", miniatura da foto (PDF: ícone), progresso por arquivo quando há mais de um, "Lido no aparelho, sem internet.", `Pular leitura`. Limite de 5 páginas e 20 s (F1.1, F1.2).
3. **Revisar dados do documento** (passo `review` de `record/new`): A6 no topo; miniatura do anexo (toque abre o visualizador; não há destaque do trecho na imagem, porque o leitor devolve só texto); A11 logo abaixo quando o nome não bate; **Registro** (tipo, título, data, local, profissional, cada um com "Sugestão" e confiança); **Encontramos no documento** com grupos Exames ({n}), Vacinas ({n}), Medicamentos ({n}), "Selecionar todos" por grupo, itens desmarcados com o trecho lido; botão fixo "Salvar registro" / "Salvar registro e {n} itens".
Estados: **nenhum item** → "Nenhum exame, vacina ou medicamento encontrado. Você pode adicionar depois."; **sem texto ou erro do módulo** → formulário manual com A10; **módulo ausente** (Expo Go fora do demo, web) → passo 2 pulado, A9; **demo sem módulo (Expo Go)** → texto simulado e A8 (dev build em demo usa o leitor real, sem A8); **data futura ou antes do nascimento** → campo vazio com "Confira a data"; **sair sem salvar** → `ConfirmSheet` "Descartar a leitura?" (o texto lido é descartado, P3); **câmera negada** → fluxo atual do MVP.
Acessibilidade: cada campo anuncia "sugestão" e a confiança em palavras; o progresso é anunciado com `polite`; o botão anuncia quantos itens serão salvos.

### 7.11 Buscar
Aba `(search)`. Título "Buscar" no conteúdo; `Stack.SearchBar` do sistema ("Exames, médicos, locais, vacinas"); campo vazio → chips de atalho (Resultados, Vacinas, Receitas). Resultados agrupados por pessoa com `SectionHeader`, linhas no formato de Documentos. A busca continua só em registros nesta rodada (`dados-saude-backend.md` §2); ~~séries de exame na busca~~ (P2).
Estados: sem resultado → "Nada encontrado para "ferritina"" + "Limpar busca". Acessibilidade: o total de resultados é anunciado.

### 7.12 Ajustes
Aba `(settings)`. Título "Ajustes". Grupos `ListSection`: conta (avatar + nome + e-mail), **Privacidade** (Revogar consentimento, Baixar meus dados — inclui exames, vacinas, medicamentos e sinais vitais —, linha informativa "Leitura de documentos: no aparelho"), no modo demo "Carregar família de exemplo" (Q10 da spec), **Sair** (destrutivo, grupo próprio), "Excluir conta" (destrutivo, confirmação dupla). É a única tela com cara de Ajustes. Tiles de ícone em `surfaceSunken` com ícone `textSecondary`, não blocos coloridos.
Estados: exportando → `Spinner` na linha e "Preparando seus dados…".

### 7.13 Boas-vindas, consentimento, login, criar família
- **Boas-vindas** (3 passos): título `largeTitle` e uma frase por passo; sem ilustração. No passo 2, uma `MeasurementRow` de exemplo rotulada "Exemplo" mostra a régua do laudo; no passo 3, "A leitura dos documentos é feita no aparelho". "Passo 2 de 3" em texto. `filled` "Continuar", `plain` "Pular".
- **Consentimento** (e **termo atualizado**, quando `CURRENT_TERMS_VERSION` muda, P1): título "Antes de começar" ou "Termo atualizado"; o parágrafo novo da spec em destaque `surface` com fio; dois `Checkbox` obrigatórios com link para o texto completo; "Aceitar e continuar" desabilitado até as duas marcas, com a dica "Marque as duas opções para continuar".
- **Login:** título "Entrar"; e-mail e "Enviar código"; Apple (botão do sistema) e Google; `OtpInput` com "Reenviar em 0:42" tabular.
- **Criar família:** "Como se chama a sua família?" (placeholder "Família Souza") → adicionar pessoas (nome, nascimento, parentesco) com o `MemberAvatar` aparecendo ao digitar; a data de nascimento ganha a dica "Usada para o calendário de vacinas".
Estados: código incorreto → "Código incorreto. Confira o e-mail ou peça outro."; offline → banner. Acessibilidade: foco inicial no primeiro campo; teclado de e-mail; `textContentType="oneTimeCode"`.

---

## 8. Tipo de registro → ícone [v4]

Fica em `src/entities/health-record/ui/recordTypeAppearance.ts` (o `shared/ui` não conhece `RecordType`). **[v4]** Na pasta, a cor é da pessoa: todo tipo usa `colorIndex: NEUTRAL_CATEGORICAL` (tinta neutra, tile `surfaceSunken` + ícone `textSecondary`) e se distingue pelo ícone e pelo rótulo, sempre escritos. Um exame nunca "parece" ser do Carlos por ter a cor dele.

| `RecordType` | Rótulo | Ícone | ~~Cor v3~~ |
|---|---|---|---|
| `result` | Resultado | `flask` | ~~0 · pine~~ |
| `consultation` | Consulta | `stethoscope` | ~~1 · ocean~~ |
| `exam` | Exame (pedido) | `clipboard` | ~~2 · moss~~ |
| `other` | Outro | `folder` | ~~3 · ochre~~ |
| `vaccine` | Vacina | `shot` | ~~4 · clay~~ |
| `prescription` | Receita | `pills` | ~~5 · plum~~ |
| `report` | Laudo | `fileText` | ~~6 · slate~~ |

## 9. Movimento [v4]

Durações e curvas **[mantido]** (`fast 120`, `base 200`, `slow 300`; `easing.out` etc.). **Assinatura [v4, revista em 12/11/2026]:** a troca de divisória troca capa, papel e conteúdo no mesmo quadro; a aba sai de trás da folha em `boardSwap.tab` (120 ms) e o conteúdo entra em `boardSwap.content` (150 ms de opacidade). Nada de crossfade de cor nem mola. O marcador da `RangeBar` continua assentando uma vez (300 ms, `easing.out`). Com Reduzir movimento, tudo é instantâneo. Navegação (push, sheet) é a do sistema. Nada de animação em loop, confete ou pulsação em estado clínico.

---

## 10. Migração código v3 → v4 [v4]

Visual e aditiva: **nenhuma tela precisa mudar para compilar**. Removidos do `tokens`: `fontFamilySerif`, `fontWeightSerif`, `SERIF_WEIGHT` e o campo `family` de `TypographyToken` (nenhuma tela usava).

| Antes (v3) | Agora (v4) | Impacto |
|---|---|---|
| Papel `#F6F4EF` / `#121513`, folha `#FFFEFB` | Folha `#F3F4F8` / `#1E2029`, surface `#FBFBFD` / `#262833` | Visual (splash do `app.json` acompanha) |
| `primary` teal `#1F6B5C` | Tinta da divisória: ultramar `#2B3FB8` fora de uma divisória, a da pessoa dentro | Botões, links, gráfico mudam com a pessoa |
| Escala clínica colorida (verde, ocre, índigo) | Tinta neutra + ícone + texto | Estado nunca colide com a cor de uma pessoa |
| Categórica pine…slate (tipos e pessoas) | 0..6 = tinta das pessoas, 7 = neutra | Tipos de registro neutros |
| Serifa nos títulos | Archivo Bold | Pode voltar o título no cabeçalho nativo se a tela quiser |
| `ListSection` em cartão | Fios da folha | Visual |
| `Avatar` círculo com anel | Capa na cor plena | Visual |
| Nada | `DividerBoard`, `Leaf`, `TabRail`, `TabMark`, `StateLine`, `HueProvider`, `Screen board/rail`, `headerOptions({ board })` | Telas adotam nas fatias delas (§3.1) |

## 10.1 Migração código v2 → v3 (histórico)

A v3 é visual e aditiva: **nenhuma API pública é removida**; `accent`, nomes de cor v2 e variantes de botão continuam compilando. Ordem sugerida: tokens → tema → componentes base → componentes novos → telas.

| Arquivo | O que muda |
|---|---|
| `src/shared/ui/tokens/colors.ts` | Valores claro/escuro do `DESIGN.md`; novas chaves `surfaceTinted`, `sage`, `rangeBand`, `rangeTrack`, `clinicalIn/High/Low/None` + `*Soft` + `onClinical*Soft`; `CATEGORICAL_NAMES` → `pine, ocean, moss, ochre, clay, plum, slate`; `primary*` passam a ser o teal `care` (nome `primary` mantido) |
| `src/shared/ui/tokens/typography.ts` | `fontFamilySerif = Platform.select({ ios: 'ui-serif', android: 'serif', default: 'serif' })`; campo `family: 'serif' \| 'sans'` em `TypographyToken`; `largeTitle/title1/title2/title3` serifados, peso 600, `letterSpacing 0`, `largeTitle` 34/40; novas variantes `metricHero`, `metric`, `metricUnit` |
| `src/shared/ui/tokens/radii.ts` | `container 20`, `card 16`, `field 12`, novos `tile 10`, `bar 2`; chaves v1 mantidas |
| `src/shared/ui/tokens/spacing.ts` | `layout.groupInset 16`, `sectionHeaderTop 28`, `sectionHeaderBottom 10`, `rowMinHeight 52`; `space[7] = 28` |
| `src/shared/ui/tokens/elevation.ts` | Nível 0 = fio `border` 1 pt (claro e escuro), sem sombra; nível 2 = sombra "Flutuante" (cor `#142820`) sem borda; escuro nível 2 sem sombra |
| `src/shared/ui/tokens/motion.ts` | Sem mudança de valores; documentar `rangeSettle` (300 ms, `easing.out`) |
| `src/shared/ui/tokens/tokens.test.ts` | Incluir todos os pares da tabela de contraste do `DESIGN.md` (texto ≥ 4,5; UI ≥ 3; categórica ≥ 4,5 sobre surface, background e soft), pares clínicos e `textPrimary/rangeBand` |
| `src/shared/ui/tokens/index.ts` | Exportar `fontFamilySerif` e os tipos novos |
| `src/shared/ui/theme/theme.ts` | `nativeColors`: `background`/`groupedBackground`/`surface` usam o hex do tema também no iOS; `headerOptions` com `contentTitle` (iOS `headerLargeTitle: false`, transparente) e fundo `paper`; Android `headerTitleStyle.fontFamily: 'serif'` |
| `src/shared/ui/theme/ThemeProvider.tsx` | Sem mudança de API |
| `src/shared/ui/components/Text.tsx` | Escolher `fontFamilySerif` quando `t.family === 'serif'`; manter `tabular` |
| `src/shared/ui/components/Card.tsx` | Raio 16, fio, `accent` no-op deprecado, `tone` |
| `src/shared/ui/components/ListSection.tsx` / `ListItem.tsx` | Raio 16 + fio; cabeçalho via `SectionHeader`; tile 36/10; `value?` |
| `src/shared/ui/components/Button.ios.tsx` / `Button.tsx` / `Button.types.ts` | Mapa de variantes v3 (filled → `borderedProminent` tint `care`) |
| `src/shared/ui/components/FloatingActionButton.ios.tsx` / `.tsx` | Sólido `care` + sombra "Flutuante"; sem `GlassSurface` |
| `src/shared/ui/components/Badge.tsx` | Tons clínicos |
| `src/shared/ui/components/Chip.tsx` | Contorno / selecionado `careSoft` + check |
| `src/shared/ui/components/Avatar.tsx` | `ring`, iniciais `main` sobre `soft` |
| `src/shared/ui/components/Screen.tsx` | Fundo `paper`; `heading` |
| `src/shared/ui/components/Banner.tsx` | `floating` sólido |
| `src/shared/ui/components/SegmentedControl.tsx` / `.ios.tsx` | Tint `care`; RN com trilho `surfaceSunken` |
| `src/shared/ui/components/Icon.tsx` | Nomes semânticos novos (`trend`, `bloodPressure`, `glucose`, `weight`, `height`, `pills`, `scanDocument`, `stateIn/High/Low/None`, `privacy`, `edit`) |
| `src/shared/ui/components/Skeleton.tsx`, `EmptyState.tsx`, `ScreenState.tsx` | Só tokens (cores, raios) |
| `src/shared/ui/navigation/ScreenTitle.tsx` | `LargeTitle` deixa de ser usado nas telas-raiz no iOS (título no conteúdo); manter para telas sem `contentTitle` |
| `src/shared/ui/components/` (novos) | `SectionHeader.tsx`, `MetricValue.tsx`, `StateChip.tsx`, `RangeBar.tsx`, `SummaryCard.tsx` (+ `StatTile`), `Sparkline.tsx`, `TrendChart.tsx`, `AttentionList.tsx`, `SuggestedField.tsx`, `ProgressSteps.tsx` |
| `src/shared/ui/index.ts` | Exportar os novos e os tipos `ReferenceState`, `ReferenceRange`, `Confidence` |
| `src/shared/ui/__catalog__/Catalog.tsx` | Incluir os novos componentes e os 4 estados clínicos nos dois temas |
| `src/shared/ui/components/v2.test.tsx`, `qa-fixes.test.tsx`, `layout-fixes.test.tsx` | Revisar asserções de raio/cor da v2; adicionar testes de `RangeBar` (posição do marcador, faixa aberta, sem faixa), `MetricValue` (rótulo de acessibilidade), `TrendChart` (resumo obrigatório) |

Fora de `shared/ui` (camadas de domínio, por outros papéis): `entities/measurement`, `entities/vaccine`, `entities/medication` (domínio + ui), `features/read-document` (`ScanProgress`), `features/add-measurement` (`VitalEntryForm`), `widgets/document-review` (`OcrReviewField`/`OcrReviewList`), mapa de tipo → cor em `entities/health-record/ui`, e as telas em `src/screens`. Posse de arquivos por fatia: `docs/features/v0.2-plano-implementacao.md`. **Não editar `src/` enquanto o trabalho v0.1.8 não for fechado.**

| v2 | v3 | Impacto |
|---|---|---|
| `colors.background #F2F2F7` / `#000000` | `#F6F4EF` / `#121513` | Visual |
| `primary #1D5BD6` / `#6E9EFF` | `#1F6B5C` / `#7CC4AE` | Visual; contraste revalidado |
| `theme.native.groupedBackground` = `PlatformColor` | hex do tema | Fundo deixa de seguir o cinza do sistema |
| Títulos SF | Serifa do sistema (conteúdo) | Cabeçalho nativo iOS sem título grande nas raízes |
| `Card accent` (pílula no topo) | no-op | Remover `accent` das telas aos poucos |
| FAB / Banner de vidro | Sólidos | Visual |
| `radii.container 26`, `card 20`, `field 14` | 20, 16, 12 | Visual |
| Categórica blue…slate | pine…slate | Cores de pessoa mudam (mesmo índice) |
| Rótulo "PRÓXIMO" em maiúsculas | `SectionHeader` serifado | Copy |

---

## 11. Acessibilidade (obrigatório)

1. **[mantido]** Contraste: texto ≥ 4,5:1, texto grande e contorno ≥ 3:1, nos dois modos. Toda combinação nova entra em `tokens.test.ts`. Valores v3 calculados no `DESIGN.md` (0 falhas).
2. **[mantido]** Alvo de toque ≥ 44 pt / 48 dp. FAB e botões 52.
3. **[mantido]** Dynamic Type até AX5; nunca desligue `allowFontScaling`. **[v3]** Valor clínico nunca trunca.
4. **[mantido]** Leitor de tela em pt-BR com papel e rótulo. **[v3]** Estado clínico sempre em texto ("acima da faixa do laudo"); unidade lida por extenso; gráfico com resumo textual + tabela; confiança do OCR em palavras.
5. **[mantido]** Reduzir transparência → sem vidro. Reduzir movimento → marcador da régua aparece no lugar.
6. **[mantido]** Toque longo nunca é o único caminho.
7. **[mantido]** Toda cor vem do tema; nada de hex na tela.
8. **[v3]** Cor nunca informa sozinha: estado = ícone + texto; tipo = ícone + texto; forma do ponto no gráfico varia por estado.

## 12. Tom de escrita (pt-BR) [mantido + v3]

Calmo, direto, sem jargão nem alarmismo. Botões com verbo + objeto ("Salvar medida", "Registrar dose"). Datas por extenso. Sem exclamação, emoji ou MAIÚSCULAS (o rótulo "PRÓXIMO" da v2 sai). **[v3]** Vocabulário clínico fixo: "dentro da faixa do laudo", "acima da faixa do laudo", "abaixo da faixa do laudo", "sem faixa no laudo", "pendente", "atrasada pelo calendário", "próxima", "sem registro", "em uso", "encerrado", "uso contínuo". Palavras vetadas e textos exatos dos avisos: spec §3.2 e §3.3 (A1–A15). O Designer não reescreve copy clínica.

---

## 13. Histórico: migração v1 → v2 [mantido como referência]

> A tabela abaixo descreve a v2. Os itens visuais foram substituídos pela v3 (§10); as correções técnicas de 13.1 e 13.2 (folha nativa, cor do título, `ListItem` com `trailing`, conteúdo descendo ao voltar) **continuam válidas** e não mudam com a v3.

Nada foi removido: **todo código v1 compila**. Os nomes antigos estão marcados com `@deprecated` e devem ser trocados aos poucos.

| v1 | v2 | Impacto | Ação no app |
|---|---|---|---|
| `Button variant="primary"` | `variant="filled"` | Visual: cápsula SwiftUI no iOS | Opcional (alias) |
| `variant="secondary"` | `variant="bordered"` | Idem | Opcional |
| `variant="ghost"` | `variant="plain"` | Idem | Opcional |
| `variant="destructive"` | `variant="filled" role="destructive"` | Idem | Opcional |
| — | `variant="glassProminent" \| "glass"` | Novo | Só na camada flutuante |
| `Button` no Jest: `fireEvent.press` | `fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } })` | **Quebra testes** que pressionam Button no iOS | Ajustar testes de telas |
| `Card tab={n}` | `Card accent={n}` | Visual: pílula no topo, no lugar da aba | Opcional (alias) |
| `Card` com sombra padrão | `elevation` padrão `0` | Cartões ficam planos | Passe `elevation={1}` se precisar |
| `Icon name="flask-outline"` (Ionicons) | `name="flask"` (`SemanticIconName`) | Aliases cobrem ~50 nomes. Nomes Ionicons sem alias continuam renderizando Ionicons | Trocar para os nomes semânticos |
| `icons.add` etc. | Mesmos atalhos, agora semânticos | — | Nenhuma |
| `Text variant="display"` | `largeTitle` | Alias | Opcional |
| `Text variant="subhead"` | `subheadline` | Alias | Opcional |
| `radii.md` em campos / `radii.lg` em cartões | `radii.field` / `radii.card` / `radii.container` | Chaves v1 mantidas | Usar as novas em código novo |
| `Select` | iOS: menu nativo com check; Android: igual | Não abre mais sheet no iOS (exceto com `description`) | Nenhuma. `SelectSheet` se quiser a sheet |
| `ActionSheet` | iOS: `confirmationDialog` do sistema | **Ícones das opções não aparecem no iOS.** `disabled` some da lista. A ação roda ~350 ms depois de fechar | Não depender de ícone para entender a opção |
| `BottomSheet` | iOS: sheet SwiftUI + `detents` opcional | Conteúdo RN dentro de host nativo. `onDismissed` ~400 ms depois de fechar | Nenhuma. Teste o fluxo em dev build |
| `Banner` | `appearance="inline"` (padrão) \| `"floating"` | Novo | Avisos de estado → `floating` |
| `IconButton variant` | + `'glass'` | Novo | Sobre imagem/cabeçalho transparente |
| `Checkbox` para liga/desliga | `Switch` | Novo | Ajustes → `Switch` |
| Grupo de `ListItem` + `Divider` | `ListSection` | Novo | Ajustes e detalhes |
| `ScrollView` com `paddingTop: insets.top` | `nativeScrollProps` sem inset manual | Evita inset dobrado sob o título grande | Ajustar telas com cabeçalho nativo |
| Menu "⋯" feito com ActionSheet | `Menu` | Novo | Preferir `Menu` para "Mais ações" |
| `ChipGroup` com `flexGrow: 0` ou margem negativa na tela | `ChipGroup` sozinho (v0.1.7): `flexGrow: 0` embutido; dentro de `Screen` sangra até a borda, fora (ex.: `ListHeaderComponent` de `FlatList`) usa a margem `screenGutter` | Margem negativa manual dentro de `Screen` dobraria o recuo | Remover `flexGrow: 0` manual (redundante) e qualquer margem negativa |
| `Select` (iOS) encolhia até o texto | Ocupa a largura (v0.1.7) | Visual | Nenhuma |
| — | `Screen presentation="sheet"`, `useScreenHorizontalInset`, `headerTitleColors(theme)` (v0.1.7) | Novos, opcionais | Ver §13.1 |
| `<Stack.Title large>` do expo-router dentro da tela | `<LargeTitle>` / `<ScreenTitle>` de `@/shared/ui/navigation` (v0.1.8) | `Stack.Title` apagava a cor do título | FamilyHome, Search, MemberTimeline |
| — | `FloatingActionButton`, `ContextMenu`, `GlassSurface`, `useInListSection`, `nativeIcon`, `resolveIcon`, `ICON_MAP`, `theme.glass`, `theme.native`, `theme.motion.spring`, `headerOptions(theme, config)`, `nativeScrollProps` | Novos exports | — |

### 13.1 Correções da v0.1.7 (verificadas no iOS 26.5)

**Folha nativa (`presentation: 'formSheet'`).** No iOS 26, se a view raiz de uma rota `formSheet` tem cor de fundo opaca, o conteúdo não pinta na montagem nem na troca de detent. Só a área fixa aparece. O `ScrollView` com cor não causa o problema, só a raiz. A causa é do host nativo da folha (react-native-screens 4.30), e o `Screen` passou a contornar:

```tsx
// rota com presentation: 'formSheet'
<Screen presentation="sheet" footer={<Button label="Salvar" fullWidth />}>
  …campos…
</Screen>
```

- O visual é igual: a cor vai no `ScrollView`, na área fixa e no corpo (`scroll={false}`). O inset `automatic` continua, então o conteúdo fica abaixo do cabeçalho da folha.
- **Não** embrulhe o `Screen` de uma folha em outra `View` com `backgroundColor`, e não ponha `style` com fundo na raiz da rota. Isso traz o bug de volta.
- O `ScrollView` próprio com `contentInsetAdjustmentBehavior="never"` dentro de `Screen scroll={false}` (contorno antigo) **também não pinta**, porque a raiz continua opaca. Troque por `presentation="sheet"`.

**Cor do título do cabeçalho.** Quando há `headerTintColor` e nenhum `headerTitleStyle.color`, o expo-router usa o tint no título (com cabeçalho transparente no iOS 26, também no título grande). Por isso o título ficava azul. O `headerOptions(theme)` já define o título com `label` e o tint só nos botões. Um layout que monta as próprias opções deve espalhar `headerTitleColors(theme)`:

```tsx
<Stack screenOptions={{ ...headerOptions(theme, { transparent: true }) }} />
// ou, mantendo opções próprias:
<Stack screenOptions={{ headerTintColor: theme.colors.primary, ...headerTitleColors(theme) }} />
```

**Blur do cabeçalho.** O `headerOptions(theme, { transparent: true })` só aplica `systemChromeMaterial` quando o Liquid Glass não está disponível (iOS < 26). No 26, o vidro do sistema já faz o papel, e o blur junto gera o aviso de efeitos sobrepostos do RNScreens.

Capturas: `docs/screenshots/v2/sheet-formsheet-bug-light.png` (antes), `sheet-formsheet-light.png` (montagem), `sheet-formsheet-detent-full-light.png` e `…-dark.png` (troca de detent), `header-title-tint-bug-light.png` (antes) e `chipgroup-select-title-light.png` (depois).

### 13.2 Correções da v0.1.8

**Folha em branco na rota real (`record/new`).** Mesmo sem fundo na raiz, a folha ficava em branco quando o `Screen` recebia `testID`. Teste A/B no iOS 26.5 (Expo Go reiniciado a cada caso, mesmo conteúdo): com `testID` na raiz, branco; sem, pinta. O layout medido estava certo (ScrollView com 476 pt), então é falha de pintura nativa, não de tamanho. A hipótese é que a raiz da rota `formSheet` precisa ser achatável pelo Fabric, e `testID` ou fundo opaco a transformam numa UIView real. Por isso, em `presentation="sheet"`, o `Screen` não põe nada na raiz:

- o `testID` vai no `ScrollView`, ou na `View` do conteúdo se `scrollViewProps.testID` já existir, ou no corpo com `scroll={false}`;
- os testes E2E continuam achando o mesmo `testID`.

Status: corrigido em código e coberto por teste. A validação no simulador está pendente; até lá, `record/new` segue como `modal`. Evidência: `.team/probes/formsheet/` (fora do repositório).

**`Stack.Title` apaga a cor do título.** O `<Stack.Title>` do expo-router reescreve `headerTitleStyle`/`headerLargeTitleStyle`, e o título volta a herdar o tint azul. Use os wrappers, que já aplicam `headerTitleColors` (o `style`/`largeStyle` passado vence):

```tsx
import { LargeTitle, ScreenTitle } from '@/shared/ui/navigation';
<LargeTitle>{family.name}</LargeTitle>
<ScreenTitle>Buscar</ScreenTitle>
```

Eles ficam em `@/shared/ui/navigation`, fora do índice principal, para o resto do DS não carregar o expo-router (no Jest, isso quebraria os testes de domínio). O helper puro `screenTitleProps(theme, props)` está no índice principal.

**Conteúdo descendo ao voltar para a tela (título grande + cabeçalho transparente).** Quando havia uma `View` com fundo entre a tela e o `ScrollView`, o iOS recalculava o inset automático ao voltar o foco, e o conteúdo descia. Agora, no iOS com `scroll` e sem `footer`, o `ScrollView` é a própria raiz (com o fundo e o `testID`), igual à `FlatList` da home. Com `footer`, ou no Android, a estrutura não muda. Validação no simulador pendente.

**`ListItem` com `onPress` e `trailing` interativo.** Antes a linha inteira era um único botão de acessibilidade, e o VoiceOver/TalkBack não chegava ao controle da direita (`Switch`, `IconButton`). Agora, com `trailing`, a área principal (título, subtítulo, meta, leading) é o botão com rótulo e `testID`, e o `trailing` é um irmão, focável à parte. O destaque de toque continua na linha toda. A API não muda.


### 13.3 Validação em aparelho da v0.2 (iPhone 17 Pro · iOS 26.5 e Android 16 · API 36)

Defeitos achados pelo Tech Lead no development build e corrigidos no DS e nas opções de rota. Cobertura: `src/shared/ui/components/device-fixes.test.tsx`. Revalidação nos aparelhos pendente (Tech Lead).

**Conteúdo sob a barra de status (A1).** O `react-native-screens` 4.30 expõe `scrollEdgeEffects` (iOS 26, padrão `automatic`), mas o efeito só aparece sob itens do cabeçalho. Nas telas com cabeçalho transparente **sem título** (raízes das abas, Pessoa) o texto passava cru sob o relógio. Agora há um véu do token `background` na altura do inset superior, com 12 pt de fade, sem toque nem foco:

```tsx
<Screen heading={{ title: 'Família Souza' }}>…</Screen>   // véu automático no iOS (heading) e com edges 'top'
<Screen heading={…} veil={false}>…</Screen>               // heading sob cabeçalho opaco: desligue
<><FlatList … /><ScrollEdgeVeil /></>                      // lista própria: véu como irmão DEPOIS da lista
```

O `Screen` nunca põe véu em `presentation="sheet"`. No Android as telas com cabeçalho têm a top app bar sólida, então o véu só entra sem cabeçalho (`edges` com `'top'`). A Busca e a Pessoa (FlatList própria) recebem o véu na rota, só no iOS.

**Espaço acima do título serifado (A2).** As abas declaravam `headerLargeTitle: true` no layout e a tela desligava depois, e o espaço do título grande ficava reservado. Os layouts das abas agora usam `headerOptions(theme, { contentTitle: true })` desde a montagem. Com `heading`, o conteúdo começa a `space[2]` (8 pt) do topo ajustado; sem `heading`, segue `space[4]`.

**Pilha flutuante (A3).** A faixa externa do `Banner appearance="floating"` tinha a largura da tela e capturava o toque da linha de baixo. Agora é `pointerEvents="box-none"`. O aviso de demonstração deixa de flutuar: use `<DemoBadge />` no topo do conteúdo. Para a lista não terminar sob o FAB, use a altura reservada do rodapé flutuante:

```tsx
const footerInset = useFloatingFooterInset();             // safe area (inclui a barra de abas) + FAB 56 + folgas
const offlineInset = useFloatingFooterInset({ pills: 1 }); // + pílula "Sem conexão"
<FlatList contentContainerStyle={{ paddingBottom: footerInset }} … />
```

`FLOATING_ACTION_HEIGHT` (56) é a altura usada na conta. As telas com FAB (Família, Pessoa nas duas vistas, Carteira de vacinas) e a Busca (só a pílula offline) usam `useFloatingFooterInset(floatingFooterOf({ offline, action }))`, com as mesmas props passadas à camada `FloatingActions`; a medição por `onLayout` (`onOccupiedChange`) saiu, porque começava em 0 e deixava o fim da lista sob o FAB no primeiro quadro. A camada não mostra mais o aviso de demonstração.

**Serifa no Android (A4).** ~~Títulos serifados em 700 no Android~~. **[v4]** Sem serifa: títulos em ArchivoSC-Bold (700), que existe como arquivo nas duas plataformas.

**Botão `plain` preto no Android (A5).** O `Button` Material passava a chave de token `primary` para `<Text color>`, onde `primary` é o alias de `textPrimary`. O rótulo agora recebe a cor do token direto (`care` no plain, `danger` no destrutivo).

**Folha com rolagem e rodapé (A6).** O RNScreens procura o `ScrollView` entre os filhos diretos do contêiner da folha (`RNSSafeAreaViewComponentView` no iOS 26) e na cadeia de primeiros filhos, e força o frame dele para a folha inteira. Com a raiz achatada, o `ScrollView` e o rodapé subiam para o contêiner, vinha o aviso "FormSheet with ScrollView expects at most 2 subviews" e o fim do conteúdo ficava sob o rodapé. A mesma correção de frame explica a folha em branco da v0.1.8: com `testID` na raiz, a cadeia de primeiros filhos achava o `ScrollView` e o reposicionava. Agora, em `presentation="sheet"` com `footer`, a raiz é real (`collapsable={false}`, ainda sem cor nem `testID`) e o primeiro filho é uma `View` vazia `collapsable={false}`; depois vêm o `ScrollView` (com o `testID`) e o rodapé (`collapsable={false}`). O RNScreens não acha o `ScrollView` e vale o layout do React. Folha só com rolagem (sem rodapé) não muda: o `ScrollView` continua a raiz. Continua valendo: não embrulhe o `Screen` de uma folha em outra `View`.

**Formulários no Android (A7).** O `formSheet` do Android é uma bottom sheet sem cabeçalho e deixa a tela de trás na árvore do TalkBack; o `Stack.Toolbar.Button` com SF Symbol também não aparece lá. As rotas de formulário usam `sheetScreenOptions()` e `<SheetCloseButton />` de `@/shared/ui/navigation`: no iOS, `formSheet` com detents `[0.8, 1]` e alça; no Android, `modal` com cabeçalho, título e "Fechar" (ícone `close` do Material Symbols).

**Ícones do cabeçalho (`TOOLBAR_ICONS`).** `Stack.Toolbar.Button` e `Stack.Toolbar.Menu` recebem `TOOLBAR_ICONS.add | edit | more` de `@/shared/ui/navigation`: SF Symbol no iOS (`plus`, `pencil`, `ellipsis`) e asset XML do `@expo/material-symbols` no Android (`add.xml`, `edit.xml`, `more_vert.xml`, os três pontos verticais da top app bar do Material). Nunca passe nome de SF Symbol direto: o Android não desenha e avisa no Metro.

**Acessibilidade (A8).** O invólucro do `Button` SwiftUI declara `role="button"` além de `accessibilityRole`, para o traço de botão não depender do rótulo, da dica ou do estado. O `Checkbox` sempre expõe `checked: true | false`.

**Trecho lido (A9).** No `SuggestedField`, a evidência é `footnote` em `textSecondary`, entre aspas tipográficas (`quoteEvidence`), sem monoespaçada. Ela é citação do documento, não código.

---

