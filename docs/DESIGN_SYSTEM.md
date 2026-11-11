# Design System — Prontuário da Família (v2 · v0.1.6 "nativo")

O código fica em `src/shared/ui` e é importado de `@/shared/ui`. Os tokens estão em `src/shared/ui/tokens`, o tema em `src/shared/ui/theme` e os componentes em `src/shared/ui/components`.
A v2 troca a pele própria da v1 ("Pasta da família" em RN puro) por **controles do sistema**: SwiftUI via `@expo/ui` e Liquid Glass via `expo-glass-effect` no iOS 26, Material 3 no Android, ícones `expo-symbols` (SF Symbols / Material Symbols). Os nomes exportados da v1 continuam válidos. Os detalhes estão na [tabela de migração](#9-migração-v1--v2).

Screenshots de referência (iPhone 17 Pro, iOS 26.5, Expo Go): `docs/screenshots/v2/` — `login|home|timeline|detail|settings` × `light|dark`, mais `timeline-dark-a11y-xl.png` e `settings-light-a11y-xl.png` (maior fonte de acessibilidade).

---

## 1. Direção

**Calmo, confiável, do sistema.** O app deve parecer feito pela Apple ou pelo Google para guardar a pasta de saúde da família. Nada de "cara de hospital" nem de IA genérica.

- **O conteúdo é plano; o vidro é só dos controles.** Liquid Glass aparece apenas na camada que flutua sobre o conteúdo: cabeçalho e barra de abas (do sistema), FAB, banner flutuante e botões sobre imagem. Cartões, listas e campos são superfícies sólidas. Vidro sobre vidro é proibido.
- **Uma cor de ação.** O azul da família (`primary`) é a única cor para tocar. As 7 cores categóricas identificam pessoas e tipos de documento, sempre com rótulo junto.
- **Listas agrupadas no lugar de cartões soltos.** Ajustes, detalhes e anexos usam `ListSection` (inset grouped). `Card` fica para itens de linha do tempo e destaques.
- **Cantos concêntricos.** container 26 → card 20 → controle em cápsula, com `borderCurve: 'continuous'`.
- **Tipo grande.** Corpo de 17 pt, nada legível abaixo de 13 pt, e Dynamic Type até a maior fonte de acessibilidade.

## 2. Uso

```tsx
// src/app/_layout.tsx
import { Stack } from 'expo-router';
import { UiProvider, useTheme, headerOptions } from '@/shared/ui';

function RootStack() {
  const theme = useTheme();
  return <Stack screenOptions={headerOptions(theme /*, { largeTitle: true, transparent: false } */)} />;
}

export default function RootLayout() {
  return (
    <UiProvider /* scheme="system" | "light" | "dark" */>
      <RootStack />
    </UiProvider>
  );
}
```

`useTheme()` retorna `{ scheme, colors, categorical, native, typography, space, layout, radii, elevation(level), motion: { duration, easing, spring, reduced }, glass: { available, reduceTransparency, enabled }, minTouchTarget }`.

- **`theme.glass.enabled`** = `isGlassEffectAPIAvailable()` **e** "Reduzir transparência" desligado. É o único sinal que um componente pode usar para decidir entre vidro e superfície sólida. O `UiProvider` escuta `AccessibilityInfo` e atualiza em tempo real.
- **`theme.native`** traz cores do sistema (`PlatformColor` no iOS: `systemGroupedBackground`, `label`, `separator`…), para cabeçalhos e fundos que precisam casar com os controles nativos e com "Aumentar contraste".
- **`headerOptions(theme, { largeTitle, transparent })`**: no iOS, título grande nativo e voltar minimalista; com `transparent`, o conteúdo passa por baixo e o sistema aplica o material. No Android, top app bar M3.
- **`nativeScrollProps`**: espalhe em `FlatList`/`SectionList`/`ScrollView` próprios (`contentInsetAdjustmentBehavior="automatic"`). **Não** some `insets.top` manualmente junto: o inset fica dobrado.
- **`nativeIcon(name, { selected })`** devolve `{ sf, md }` para APIs do expo-router que recebem nomes de símbolo (NativeTabs, toolbar).

---

## 3. Tokens

### 3.1 Cor

Os valores espelham a paleta agrupada do iOS e o neutro do M3. Todos os pares de texto e fundo são testados em `tokens/tokens.test.ts` para WCAG AA.

| Papel | Claro | Escuro | Uso |
|---|---|---|---|
| `background` | `#F2F2F7` | `#000000` | Fundo da tela (systemGroupedBackground) |
| `surface` | `#FFFFFF` | `#1C1C1E` | Seções, cartões, campos |
| `surfaceSunken` | `#E9E9EF` | `#2C2C2E` | Pressionado (iOS), skeleton, trilho |
| `surfaceRaised` | `#FFFFFF` | `#2C2C2E` | Sheet, fallback sólido do vidro |
| `textPrimary / Secondary / Tertiary` | `#111114 / #55555C / #6B6B72` | `#FFF / #AEAEB2 / #98989F` | Rótulos. O secundário do iOS (60% de opacidade) não passa AA, por isso é sólido e mais escuro |
| `border` | `#DCDCE1` | `#38383A` | Separador decorativo |
| `borderStrong` | `#8A8A91` | `#7C7C82` | Contorno de campo, ≥3:1 (WCAG 1.4.11) |
| `primary` | `#1D5BD6` | `#6E9EFF` | Única cor de ação (5,9:1 sobre branco) |
| `success / warning / danger / info` + `*Soft` / `on*Soft` | — | — | Estados (Banner, Badge) |

**Paleta categórica** (`theme.categorical[0..6]`: blue, teal, green, amber, rose, violet, slate). Cada uma tem `main` (≥4.5:1 sobre surface e sobre `soft`), `soft` e `onMain`. Para pessoas, use `categoricalIndexFor(id)` (hash estável).

### 3.2 Tipografia

Usa a fonte do sistema (SF Pro / Roboto) com os nomes dos estilos do iOS. `maxFontSizeMultiplier` só limita o exagero.

| Variante | pt / linha / peso | Uso |
|---|---|---|
| `largeTitle` | 34/41/700 | Título de tela sem cabeçalho nativo |
| `title1` · `title2` · `title3` | 28 · 22 · 20 | Títulos de detalhe e seção |
| `headline` | 17/22/600 | Título de cartão, cabeçalho de ListSection (iOS) |
| `body` · `bodyStrong` | 17/22 | Texto corrido, rótulo de linha |
| `callout` | 16/21 | Texto de apoio maior |
| `subheadline` | 15/20 | Subtítulo de linha, meta |
| `footnote` · `caption` | 13/18 | Rodapé de seção, legenda (o iOS usa 12, mas aqui o mínimo é 13 por causa do público) |
| `label` | 17/22/600 | Rótulo de botão RN (Android) |

Títulos (`isHeading`) são anunciados como cabeçalho. `display` e `subhead` continuam como aliases v1.

### 3.3 Espaçamento, layout, raio

- **`space`**: `0.5=2, 1=4, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32, 10=40, 12=48, 16=64`.
- **`layout`**: `screenGutter 20`, `sectionGap 32`, `fieldGap 20`, `maxContentWidth 640`, `controlHeight 52`, `controlHeightSmall 44`.
- **`radii` v2**: `container 26` (ListSection, sheet), `card 20`, `field 14` (TextField, Select, DateField), `control 999` (botões, chips, FAB, SearchField), `sheet 34`. As chaves v1 `xs…xl, full` continuam. Use `concentric(outer, inset)` para calcular o raio interno.

### 3.4 Elevação

`theme.elevation(0–3)`. No claro é uma sombra suave; no escuro, tom de superfície e contorno fino. Na v2 quase nada usa sombra: listas e cartões são planos (`elevation 0`), e o vidro traz a própria profundidade. O nível 2 é o fallback sólido do vidro, o 3 é a sheet no Android.

### 3.5 Movimento

- `duration` (`fast 120`, `base 200`, `slow 300`), `easing` (`out`, `in`, `standard`) e o novo **`spring`** (`snappy`, `smooth`) para Reanimated/Animated.
- Os componentes nativos (sheet, menu, diálogo, vidro) usam a animação do sistema, que já respeita "Reduzir movimento". Em animação RN nova, verifique `theme.motion.reduced` e troque por fade.

---

## 4. Regras do Liquid Glass

1. **Somente `GlassSurface`** (ou componentes que o usam: FAB, `IconButton variant="glass"`, `Banner appearance="floating"`). Não importe `GlassView` em telas.
2. **Só na camada flutuante**: sobre conteúdo que rola ou sobre imagem. Nunca em cartão, linha de lista ou campo, nem vidro dentro de vidro.
3. **Nunca `opacity < 1`** em um GlassView nem em um ancestral dele: o efeito some ou pisca. Para esconder, desmonte. Para desabilitar, use cor de texto `disabled`.
4. **Fallback obrigatório.** Com `theme.glass.enabled === false` (iOS < 26, Reduzir transparência, Android, web), `GlassSurface` vira uma superfície sólida `surfaceRaised` com contorno fino e `elevation(2)`. Mesmo tamanho, mesmo texto, mesmo contraste.
5. **Texto sobre vidro** usa `textPrimary` ou `primary` com peso ≥ 600. Não use `textTertiary`.
6. O cabeçalho e a barra de abas já recebem vidro do sistema no iOS 26. Não ponha um GlassSurface por trás deles.

## 5. Plataformas e fallbacks

| Componente | iOS 26 | Android | Observação |
|---|---|---|---|
| Button | SwiftUI `Button` (`glassProminent`, `glass`, `borderedProminent`, `bordered`, `plain`), cápsula | RN M3: filled, tonal, text | No iOS < 26 o `glass*` cai para `bordered*` |
| FloatingActionButton | SwiftUI `glassProminent`, círculo ou cápsula, `extraLarge` | FAB M3 56 dp, raio 16, `primarySoft` | — |
| Menu / ContextMenu | SwiftUI `Menu` / `contextMenu` (`@expo/ui/community/menu`) | Compose `DropdownMenu` | Ícones só no iOS (M3 recomenda menu só com texto) |
| Select | Menu nativo com marca de seleção | `SelectSheet` (BottomSheet RN) | Com `description` em alguma opção, o iOS também usa `SelectSheet` |
| SegmentedControl | SwiftUI `Picker(.segmented)` | Botões segmentados M3 (contorno, check no selecionado) | — |
| Switch | `UISwitch` | Switch M3 | A linha inteira é tocável |
| ActionSheet | SwiftUI `confirmationDialog` | BottomSheet RN com lista | **iOS não mostra ícones** (padrão do sistema) |
| BottomSheet | SwiftUI `.sheet` com detents e vidro do sistema | RN Modal, topo 28, alça | — |
| Ícones | SF Symbols | Material Symbols | `expo-symbols` |
| Vidro | `GlassView` | Sólido | Ver §4 |

**Em teste (Jest/jest-expo, plataforma iOS)**, os botões SwiftUI não recebem `press`. Acione com
`fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } })` usando o `testID` / rótulo do wrapper acessível.

---

## 6. Componentes

Todos aceitam `style` e `testID`. Props marcadas como v1 continuam funcionando.

### Base
| Componente | Props principais | Notas |
|---|---|---|
| `Screen` | `scroll`, `padded`, `footer`, `keyboard`, `presentation: 'screen'\|'sheet'` | Usa `nativeScrollProps`. Em rota `formSheet` use `presentation="sheet"` (ver §9.1/§9.2). O `testID` vai na raiz, exceto em folha e no iOS com `scroll` sem `footer`, em que vai no `ScrollView` (ver §9.2). Expõe `useScreenHorizontalInset()` para filhos que sangram até a borda |
| `Text` | `variant`, `color` (`primary\|secondary\|tertiary\|danger\|disabled\|inverse\|…`), `tabular`, `align`, `numberOfLines` | — |
| `Icon` | `name: SemanticIconName` (ou Ionicons v1), `size=22`, `color`, `weight`, `filled`, `accessibilityLabel` | Sem rótulo, fica decorativo e oculto do leitor de tela. Mapa em `ICON_MAP`; `resolveIcon`, `nativeIcon` |
| `GlassSurface` **novo** | `shape: 'capsule'\|'container'\|'card'\|'circle'`, `interactive`, `tint`, `accessible`, `accessibilityLabel` | Ver §4 |

### Ações
| Componente | Props | Notas |
|---|---|---|
| `Button` | `label`, `onPress`, `variant: 'glassProminent'\|'glass'\|'filled'\|'bordered'\|'plain'` (+ v1), `role: 'default'\|'destructive'\|'cancel'`, `size: 'md'\|'sm'`, `icon`, `iconPosition`, `loading`, `disabled`, `fullWidth` | `glass*` só para ação sobre a camada de controles (rodapé flutuante, sobre imagem). Dentro do conteúdo use `filled`/`bordered`. `resolveButtonStyle()` exportado |
| `IconButton` | `icon`, `accessibilityLabel` (obrigatório), `variant: 'plain'\|'tonal'\|'filled'\|'glass'`, `color`, `iconSize` | `glass` = círculo de vidro (sobre imagem/cabeçalho transparente) |
| `FloatingActionButton` **novo** | `icon`, `label`, `onPress`, `extended`, `disabled`, `accessibilityHint` | Um por tela, para a ação principal ("Adicionar documento"). `extended` mostra o rótulo; mesmo compacto, `label` vira o rótulo de acessibilidade |
| `Menu` **novo** | `items: MenuItem[]`, `children` (gatilho), `title`, `stretch` | Toque abre. `stretch` faz o gatilho ocupar a largura (linha de lista) |
| `ContextMenu` **novo** | igual a `Menu` | Toque longo. Ofereça sempre o mesmo caminho por outro lugar: toque longo não é descobrível |
| `MenuItem` | `id`, `label`, `icon`, `onPress`, `destructive`, `disabled`, `selected`, `children`, `inline` | `children` vira submenu; `inline` vira seção |

### Entrada
| Componente | Props | Notas |
|---|---|---|
| `TextField` | v1 sem mudança (`label`, `value`, `onChangeText`, `error`, `hint`, `optional`, …) | Raio `field` 14, contorno `borderStrong` |
| `SearchField` | v1 | Cápsula |
| `OtpInput` | v1 | — |
| `DateField` | v1 | Raio `field` |
| `Select` | v1 (`label`, `value`, `options`, `onChange`, …) | iOS: menu nativo. Ocupa a largura toda, como os outros campos. `SelectSheet` exportado para forçar a sheet |
| `SegmentedControl` | v1 (`options`, `value`, `onChange`, `accessibilityLabel`) | 2–4 opções curtas |
| `Switch` **novo** | `value`, `onValueChange`, `label`, `description`, `disabled` | Linha inteira com `role="switch"` e `checked` |
| `Checkbox` | v1 | Círculo no iOS, quadrado M3 no Android. Para liga/desliga, prefira `Switch` |

### Conteúdo
| Componente | Props | Notas |
|---|---|---|
| `ListSection` **novo** | `header`, `footer`, `separatorInset: 'text'\|'none'\|number`, `children` | Lista agrupada inset (raio 26). `ListItem` dentro dela vira célula |
| `ListItem` | `title`, `subtitle`, `meta`, `leading`, `trailing`, `onPress`, `chevron`, `destructive`, `disabled` | Chevron só no iOS. Com fonte de acessibilidade (≥1,35×), `meta` desce para baixo do título. Com `trailing`, o controle da direita é um elemento de acessibilidade separado (ver §9.2) |
| `Card` | `accent?: CategoricalIndex` (v1 `tab`), `onPress`, `elevation=0`, `padded`, `accessibilityLabel` | Raio 20. O acento é uma pílula 28×4 no topo; não use acento e Badge da mesma cor juntos |
| `Avatar`, `Badge`, `Chip`/`FilterChip`/`ChipGroup`, `Divider`, `Spinner`, `Skeleton*` | v1 | Dentro de um `Screen`, o `ChipGroup` sangra até a borda sozinho: o 1º chip fica na margem e a rolagem vai até a borda. Não aplique margem negativa na tela |
| `Banner` | v1 + `appearance: 'inline'\|'floating'` | `floating` = pílula de vidro sobre o conteúdo (ex.: offline, modo demo) |
| `EmptyState`, `ListSkeleton`, `LoadErrorState`, `OfflineBanner`, `errorMessage` | v1 | Ícones semânticos |

### Sobreposição
| Componente | Props | Notas |
|---|---|---|
| `BottomSheet` | v1 (`visible`, `onClose`, `onDismissed`, `title`, `message`, `children`) + `detents?: ('half'\|'full')[]` | Sem `detents`, ajusta ao conteúdo |
| `ActionSheet` | v1 (`visible`, `onClose`, `options`, `title`, `message`, `cancelLabel`) | A ação escolhida roda depois que o diálogo fecha |
| `ConfirmSheet` | v1 | Use para toda ação destrutiva |

---

## 7. Padrões de tela

| Padrão | Receita |
|---|---|
| **Lista / linha do tempo** | Cabeçalho nativo com título grande. `SearchField`, `ChipGroup` e depois `FlatList` com `nativeScrollProps`. Itens são `Card` (sem acento quando já há `Badge` do tipo) agrupados por mês (`title3`). A ação principal vai no `FloatingActionButton extended`. |
| **Início da família** | Seção "Próximo" (`Card accent`), pessoas em `ListSection` com `Avatar`. Avisos de estado (offline, modo demo) em `Banner appearance="floating"` acima do FAB. |
| **Detalhe** | Título `title2`, `Badge` do tipo, data por extenso. Dados e anexos em `ListSection`. "Mais ações" num `Menu` sobre `IconButton` (`glass` sobre imagem, `plain` no cabeçalho). Excluir fica no menu como `destructive` e confirma com `ConfirmSheet`. Ações do fluxo usam `filled`/`bordered`. |
| **Ajustes** | Só `ListSection`. Toggles com `Switch`. Escolha única curta com `Menu stretch` sobre `ListItem` (meta = valor atual, ícone `expand`). "Sair" numa seção própria, `destructive`. |
| **Formulário** | `Screen footer` com um `Button filled fullWidth`. Campos com `layout.fieldGap`. Valide ao sair do campo ou ao enviar. |
| **Vazio / Erro / Carregando** | Mesmo da v1 (`EmptyState`, `LoadErrorState`, `ListSkeleton`). |

## 8. Tipo de registro → cor e ícone

Fica em `src/entities/health-record/ui`, porque o `shared/ui` não conhece `RecordType`. Ícones v2 semânticos:

| `RecordType` | Rótulo | Cor | Ícone (semântico → SF / Material) |
|---|---|---|---|
| `consultation` | Consulta | 0 · blue | `stethoscope` |
| `exam` | Exame | 1 · teal | `flask` → flask / science |
| `result` | Resultado | 2 · green | `pulse` → waveform.path.ecg / monitor_heart |
| `report` | Laudo | 5 · violet | `fileText` → doc.text / description |
| `prescription` | Receita | 3 · amber | `clipboard` → list.clipboard / assignment |
| `vaccine` | Vacina | 4 · rose | `shot` → syringe / vaccines |
| `other` | Outro | 6 · slate | `folder` |

Mostre sempre o rótulo junto. Cor e ícone ajudam, mas não substituem o texto.

---

## 9. Migração v1 → v2

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
| — | `Screen presentation="sheet"`, `useScreenHorizontalInset`, `headerTitleColors(theme)` (v0.1.7) | Novos, opcionais | Ver §9.1 |
| `<Stack.Title large>` do expo-router dentro da tela | `<LargeTitle>` / `<ScreenTitle>` de `@/shared/ui/navigation` (v0.1.8) | `Stack.Title` apagava a cor do título | FamilyHome, Search, MemberTimeline |
| — | `FloatingActionButton`, `ContextMenu`, `GlassSurface`, `useInListSection`, `nativeIcon`, `resolveIcon`, `ICON_MAP`, `theme.glass`, `theme.native`, `theme.motion.spring`, `headerOptions(theme, config)`, `nativeScrollProps` | Novos exports | — |

### 9.1 Correções da v0.1.7 (verificadas no iOS 26.5)

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

### 9.2 Correções da v0.1.8

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

---

## 10. Acessibilidade (obrigatório)

1. **Contraste**: texto ≥4.5:1, texto grande e contorno ≥3:1, nos dois modos. Toda combinação nova entra em `tokens.test.ts`.
2. **Alvo de toque** ≥ `theme.minTouchTarget` (44 pt / 48 dp). FAB 56, botões 52.
3. **Dynamic Type**: nunca desligue `allowFontScaling`. Teste na maior fonte de acessibilidade. Linhas lado a lado precisam quebrar (o `ListItem` já empilha o meta).
4. **Leitor de tela**: todo controle tem papel e rótulo em pt-BR. Botões SwiftUI ficam dentro de um wrapper RN acessível com ação `activate`. `Switch` anuncia "interruptor, ligado". Cartões e linhas tocáveis são lidos como um elemento só.
5. **Reduzir transparência** → sem vidro (automático). **Reduzir movimento** → animações do sistema cuidam disso; em animação RN, use `theme.motion.reduced`.
6. **Toque longo** (`ContextMenu`) nunca é o único caminho para uma ação.
7. **Modo escuro**: toda cor vem de `theme.colors`, `theme.categorical` ou `theme.native`. Nada de hex na tela.

## 11. Tom de escrita (pt-BR)

Calmo, direto, sem jargão técnico nem alarmismo. Botões com verbo + objeto ("Adicionar documento"). Datas por extenso. Sem exclamação, emoji ou MAIÚSCULAS para ênfase (exceção: o rótulo de seção pequeno "PRÓXIMO", em `footnote`). Ver os exemplos da v1 no histórico do git, que continuam valendo.
