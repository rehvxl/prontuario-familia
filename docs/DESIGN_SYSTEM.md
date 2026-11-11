# Design System — Prontuário da Família (v0.1.1)

Código-fonte: `src/shared/ui` · API pública única: `import { … } from '@/shared/ui'`.
Testes: `npx jest src/shared/ui` (contraste AA verificado automaticamente em `tokens/tokens.test.ts`).

---

## 1. Direção visual: "Pasta da família"

A referência é a pasta física onde a família guarda exames, receitas e cadernetas de vacina: papel claro, divisórias coloridas e uma caneta azul. O app deve passar a mesma sensação: as coisas estão guardadas, organizadas e fáceis de achar. Não deve parecer hospital (branco clínico e verde-cirúrgico) nem IA genérica (gradientes roxos e vidro).

**Contrato da direção**

| Eixo | Decisão |
|---|---|
| Fundo | Papel levemente quente (`#F5F5F1`), com superfícies brancas por cima. No escuro, grafite azulado (`#111318`), sem preto puro. |
| Cor de ação | Uma só: **azul-caneta** (`#2D45B5`, escuro `#9FB1FF`). Se algo é azul-caneta, dá para tocar. |
| Cor categórica | 7 "divisórias" (`blue, teal, green, amber, rose, violet, slate`). Servem para identificar tipos de documento e pessoas, **nunca** como única fonte de informação. |
| Tipografia | Fonte do sistema (SF Pro / Roboto). Corpo com 17 pt e escala segue a do iOS. Sem fonte de display: o tom é de documento, não de marca. |
| Densidade | Confortável: linhas de lista de 52–64 pt, campos de 52 pt, margem de tela de 20 pt. |
| Movimento | Curto (120–300 ms), com ease-out exponencial. Desliga com "Reduzir movimento". |
| **Assinatura** | **A aba da divisória**: uma lingueta colorida de 36×5 pt na borda superior do `Card` (`tab={i}`), repetida como ponto colorido nos `Chip`s de filtro. É o único ornamento do sistema. |

> Seed do Impeccable: `none (unavailable)`. O launcher `concept-seed` não estava disponível neste ambiente, então a direção foi decidida pelo código e pelo contexto (docs/PRODUCT.md e público).

**Princípios**

1. **Legível antes de bonito.** Corpo com 17 pt e Dynamic Type até 200%. Contraste AA em todos os pares, testado.
2. **Calma.** Pouca cor por tela, sem alertas desnecessários e com erro que sempre diz como resolver.
3. **Nativo.** O cabeçalho é do expo-router (título grande no iOS, top app bar no Android), o voltar é do sistema e os seletores de data são nativos. O ripple aparece no Android e o feedback de opacidade no iOS.
4. **Toque generoso.** O alvo mínimo é 44 pt no iOS e 48 dp no Android (`theme.minTouchTarget`), e a linha inteira é tocável.
5. **Nada só por cor.** Cada estado também tem ícone, texto ou forma (✓ no chip selecionado, ícone no erro).

---

## 2. Uso

```tsx
// src/app/_layout.tsx
import { Stack } from 'expo-router';
import { UiProvider, useTheme, headerOptions } from '@/shared/ui';

function RootStack() {
  const theme = useTheme();
  return <Stack screenOptions={headerOptions(theme)} />;
}

export default function RootLayout() {
  return (
    <UiProvider /* scheme="system" | "light" | "dark" */>
      <RootStack />
    </UiProvider>
  );
}
```

`useTheme()` retorna `{ scheme, colors, categorical, typography, space, layout, radii, elevation(level), motion: { duration, easing, reduced }, minTouchTarget }`. Fora do provider, ele lança um erro.

---

## 3. Tokens

### 3.1 Cor: papéis

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `background` | `#F5F5F1` | `#111318` | Fundo da tela |
| `surface` | `#FFFFFF` | `#1A1D24` | Cartões, campos, sheets |
| `surfaceRaised` | `#FFFFFF` | `#232731` | Cartão elevado no escuro |
| `surfaceSunken` | `#ECECE6` | `#0C0E12` | Trilho do segmented, skeleton |
| `scrim` | `rgba(17,19,24,.45)` | — | Atrás de sheets |
| `textPrimary` | `#1B1F2A` | `#ECEDF0` | Texto principal |
| `textSecondary` | `#4A5060` | `#B6BAC5` | Subtítulos, ajuda |
| `textTertiary` | `#626878` | `#9095A3` | Placeholder, metadados (≥4.5:1) |
| `textDisabled` | `#8D919C` | `#5F6472` | Desabilitado (isento de AA) |
| `border` | `#E1E1DA` | `#2A2E38` | Divisores (decorativo) |
| `borderStrong` | `#848A98` | `#6E7484` | Contorno de campo/controle (≥3:1) |
| `focusRing` | `#2D45B5` | `#9FB1FF` | Anel de foco (teclado, Switch Control) |
| `primary` / `onPrimary` | `#2D45B5` / `#FFFFFF` | `#9FB1FF` / `#10183F` | Ação principal |
| `primaryPressed` | `#22378F` | `#BCC8FF` | Pressionado (iOS) |
| `primarySoft` / `onPrimarySoft` | `#E6EAFA` / `#1E2F80` | `#263063` / `#D6DDFF` | Botão secundário, seleção |
| `success` · `successSoft` · `onSuccessSoft` | `#1E7A4C` · `#E3F3EA` · `#1A6A42` | `#7FD3A4` · `#1D3A2B` · `#A9E5C3` | Concluído |
| `warning` · `warningSoft` · `onWarningSoft` | `#8A5300` · `#FCF0D9` · `#7A4A00` | `#F2BE62` · `#3D3020` · `#F7D597` | Atenção, modo demo |
| `danger` · `dangerSoft` · `onDangerSoft` | `#B3261E` · `#FBE7E5` · `#9A1F18` | `#FF9A8F` · `#46211F` · `#FFC4BD` | Erro, destrutivo |
| `info` · `infoSoft` · `onInfoSoft` | `#1D6584` · `#E2F0F6` · `#185874` | `#7CC8E8` · `#1B3542` · `#B2DFF2` | Informação |

### 3.2 Cor: paleta categórica (divisórias)

Os índices `0–6` têm o tipo `CategoricalIndex`. Use `theme.categorical[i]` → `{ name, main, soft, onMain }`. `main` serve para texto ou ícone sobre `soft`, e `onMain` para texto sobre `main`. Todos os pares passam AA nos dois temas.

| # | Nome | main (claro) | soft (claro) | main (escuro) | soft (escuro) |
|---|---|---|---|---|---|
| 0 | blue | `#2F5FD0` | `#ECF1FB` | `#82A4FF` | `#2F3850` |
| 1 | teal | `#0E7672` | `#E9F3F2` | `#4FC6C0` | `#253F43` |
| 2 | green | `#3A7522` | `#EDF3EB` | `#8FCB6E` | `#314033` |
| 3 | amber | `#A65800` | `#F7F0E8` | `#F0A24D` | `#45382C` |
| 4 | rose | `#C0335A` | `#F9EDF0` | `#F4859F` | `#46323D` |
| 5 | violet | `#7449BF` | `#F2EFF9` | `#B99EFF` | `#3A3750` |
| 6 | slate | `#56607A` | `#F0F1F3` | `#A6AFC2` | `#363A44` |

`categoricalIndexFor(id)` dá uma cor estável por id (FNV-1a mod 7). O `Avatar` usa isso: a mesma pessoa tem sempre a mesma cor.

### 3.3 Tipografia

A fonte é a do sistema (`fontFamily`, com `fontFamilyMedium` no Android). Todos os textos escalam com o tamanho de fonte do sistema, e `maxFontSizeMultiplier` limita só o que quebraria o layout.

| Variante | Tamanho/linha | Peso | Máx. escala | Uso |
|---|---|---|---|---|
| `display` | 34/41 | 700 | 1.4 | Boas-vindas |
| `title1` | 28/34 | 700 | 1.6 | Título de tela sem cabeçalho |
| `title2` | 22/28 | 700 | 1.8 | Seção |
| `title3` | 20/25 | 600 | 1.8 | Estado vazio, título de sheet |
| `headline` | 17/22 | 600 | 2 | Rótulo de campo, título de card |
| `body` | 17/24 | 400 | 2 | Texto corrido, lista |
| `bodyStrong` | 17/24 | 600 | 2 | Ênfase |
| `label` | 17/22 | 600 | 1.6 | Botões |
| `callout` | 16/22 | 400 | 2 | Texto auxiliar maior |
| `subhead` | 15/20 | 400 | 2 | Subtítulo, chips |
| `footnote` | 13/18 | 400 | 2 | Ajuda e erro de campo |
| `caption` | 13/16 | 400 | 2 | Badge, legenda |

Os títulos (`display`…`title3`) recebem `accessibilityRole="header"` automaticamente.

### 3.4 Espaçamento, layout, raio

- **`space`** em pt: `0.5=2, 1=4, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32, 10=40, 12=48, 16=64`.
- **`layout`**: `screenGutter 20`, `sectionGap 32`, `fieldGap 20`, `maxContentWidth 640` (tablet), `controlHeight 52`, `controlHeightSmall 44`.
- **`radii`**: `xs 4`, `sm 8`, `md 12` (campos, banner), `lg 16` (cards, sheets), `xl 24`, `full 999` (chips, badges).

### 3.5 Elevação

`theme.elevation(0–3)`. Cada nível é declarado uma vez: no claro é uma sombra suave com deslocamento (iOS `shadow*`, Android `elevation`); no escuro é uma borda de 1 px, porque sombra não aparece. Nunca combine os dois.

| Nível | Uso |
|---|---|
| 0 | Plano |
| 1 | Card |
| 2 | Elemento flutuante (FAB, futuro) |
| 3 | BottomSheet / ActionSheet |

### 3.6 Movimento

- **`duration`**: `instant 0`, `fast 120` (pressionar), `base 200` (aparecer), `slow 300` (sheet).
- **`easing`**: curvas bézier `out [0.16,1,0.3,1]`, `in`, `standard`.
- `theme.motion.reduced` acompanha "Reduzir movimento" do sistema. Com ele ligado, a sheet aparece sem deslizar e o skeleton fica parado.

---

## 4. Componentes

As props principais estão abaixo. A tipagem completa fica nos arquivos `src/shared/ui/components/*.tsx`.

### Screen
Safe area, rolagem opcional, teclado e rodapé fixo.

| Prop | Tipo | Padrão |
|---|---|---|
| `scroll` | `boolean` | `true` |
| `padded` | `boolean` | `true` (20 pt) |
| `edges` | `Edge[]` | `['left','right','bottom']` (o cabeçalho cuida do topo) |
| `footer` | `ReactNode` | — (sobe com o teclado) |
| `background` | `'background' \| 'surface'` | `'background'` |
| `keyboardAvoiding` | `boolean` | `true` |

```tsx
<Screen footer={<Button label="Salvar" onPress={save} fullWidth />}>
  <TextField label="Nome" value={name} onChangeText={setName} />
</Screen>
```

Para listas longas, use `<Screen scroll={false} padded={false}>` com `FlatList` dentro.

### Text
`variant` (§3.3), `color` (`primary | secondary | tertiary | inverse | disabled | link | danger | …` ou qualquer token), `align` e `tabular` (números alinhados).

```tsx
<Text variant="title2">Documentos da Ana</Text>
<Text color="secondary">Atualizado em 12 de março de 2024</Text>
```

### Icon
É um wrapper de Ionicons. As props são `name`, `size=24`, `color` (token ou cor) e `accessibilityLabel`. Sem rótulo, o ícone é decorativo e fica oculto do leitor de tela. O objeto `icons` traz apelidos genéricos: `add, back, close, check, search, filter, calendar, camera, gallery, file, fileText, attach, share, download, edit, trash, person, people, settings, lock, shield, info, warning, error, success, stethoscope, flask, pulse, clipboard, pill, shot, folder, more, logout, mail`.

```tsx
<Icon name={icons.camera} />
```

### Button
| Prop | Tipo | Padrão |
|---|---|---|
| `label` | `string` | — |
| `onPress` | `() => void` | — |
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'destructive'` | `'primary'` |
| `size` | `'md'` (52) `\| 'sm'` (44/48) | `'md'` |
| `icon`, `iconPosition` | `IconName`, `'start' \| 'end'` | —, `'start'` |
| `loading`, `disabled`, `fullWidth` | `boolean` | `false` |

Em `loading`, o botão anuncia `busy`, bloqueia o toque e mantém o rótulo. Use **um** `primary` por tela.

```tsx
<Button label="Adicionar documento" icon="add" onPress={open} />
<Button label="Excluir" variant="destructive" onPress={confirm} />
```

### IconButton
`icon`, `accessibilityLabel` (**obrigatório**), `onPress`, `variant: 'plain' | 'tonal' | 'filled'`, `color` e `disabled`. O alvo é sempre `minTouchTarget`.

```tsx
<IconButton icon="share-outline" accessibilityLabel="Compartilhar documento" onPress={share} />
```

### TextField
Aceita as props de `TextInput` e mais `label`, `helper`, `error`, `optional`, `disabled`, `leadingIcon` e `multiline` (120 pt). O rótulo fica sempre visível acima do campo, nunca só como placeholder. O erro aparece abaixo, com ícone, e é anunciado.

```tsx
<TextField label="Médico ou profissional" optional value={v} onChangeText={setV} helper="Ex.: Dra. Helena Souza" />
<TextField label="E-mail" error="Confira o e-mail: falta o @." keyboardType="email-address" />
```

### SearchField
As props são `value`, `onChangeText`, `onSubmit`, `placeholder="Buscar exames, médicos, locais"` e `onClear`. Tem papel `search` e mostra o botão "Limpar busca" quando há texto.

### OtpInput
As props são `value`, `onChange`, `onComplete(code)`, `length=6`, `label="Código de verificação"`, `helper`, `error`, `autoFocus` e `disabled`. Há um único `TextInput` invisível sobre as caixas, com `textContentType="oneTimeCode"` e `autoComplete="sms-otp"` no Android. Isso permite autopreenchimento por SMS, colar o código e apagar normalmente. A entrada é saneada com `sanitizeOtp` (só dígitos).

```tsx
<OtpInput value={code} onChange={setCode} onComplete={verify} error={err} />
```

### DateField
As props são `label`, `value: 'YYYY-MM-DD' | null`, `onChange`, `minimumDate`, `maximumDate`, `optional`, `clearable`, `helper` e `error`. No Android abre o diálogo nativo, com botões "Concluir/Cancelar". No iOS abre uma sheet com calendário inline em pt-BR e as ações "Limpar data" e "Concluir". O valor aparece por extenso ("12 de março de 2024"). Use `formatDate`/`parseISODate`/`toISODate` para converter.

```tsx
<DateField label="Data do exame" value={date} onChange={setDate} maximumDate={new Date()} />
```

### Select
As props são `label`, `options: { value, label, description? }[]`, `value | null`, `onChange`, `placeholder="Selecionar"`, `helper`, `error` e `optional`. Abre uma BottomSheet com opções de rádio. Para 2–4 opções curtas, prefira `SegmentedControl`.

### SegmentedControl
As props são `options: { value, label }[]`, `value`, `onChange` e `accessibilityLabel` (obrigatório). Usa o papel `radiogroup`/`radio`.

```tsx
<SegmentedControl accessibilityLabel="Ordenar por" options={[{value:'recent',label:'Mais recentes'},{value:'old',label:'Mais antigos'}]} value={o} onChange={setO} />
```

### Checkbox
As props são `checked`, `onChange(bool)`, `label`, `description`, `error` e `disabled`. A linha inteira é tocável, com caixa de 28 pt e retorno háptico. Use para consentimento.

```tsx
<Checkbox checked={ok} onChange={setOk} label="Li e aceito os termos de uso" error={showErr ? 'Para continuar, aceite os termos.' : undefined} />
```

### Card
As props são `children`, `onPress`, `accessibilityLabel`, `tab?: CategoricalIndex` (a aba da divisória, que é a assinatura), `elevation=1` e `padded=true`. Não aninhe cards e não use card para tudo: listas são `ListItem`.

```tsx
<Card tab={1} onPress={openRecord} accessibilityLabel="Hemograma, exame, 12 de março de 2024">
  <Badge label="Exame" colorIndex={1} icon="flask-outline" />
  <Text variant="headline" style={{ marginTop: 8 }}>Hemograma completo</Text>
</Card>
```

### ListItem
As props são `title`, `subtitle`, `meta` (à direita, ex.: data), `leading`, `trailing`, `onPress`, `chevron` (só aparece no iOS), `destructive` e `disabled`. A linha é lida como um único elemento ("título, subtítulo, meta").

```tsx
<ListItem leading={<Avatar name="Ana Lima" id={m.id} />} title="Ana Lima" subtitle="12 anos · 8 documentos" onPress={go} />
```

### Avatar
As props são `name`, `id`, `size: 'sm' 32 | 'md' 44 | 'lg' 56 | 'xl' 80`, `imageUri` e `accessible=false`. Mostra as iniciais (ignorando "da/de/do/e") sobre a cor categórica do id. É decorativo por padrão, porque o nome já aparece ao lado.

### Chip / FilterChip / ChipGroup
- **`Chip`** aceita `label`, `onPress`, `selected`, `icon`, `colorIndex` e `disabled`. A altura visual é 40 pt, e o `hitSlop` completa o alvo mínimo. Quando selecionado, mostra ✓, fundo `soft` e borda `main`.
- **`FilterChip`** é um `Chip` com `selected` e `onPress` obrigatórios.
- **`ChipGroup<T>`** aceita `options: { value, label, icon?, colorIndex? }[]`, `value: T[]`, `onChange`, `multiple=true`, `allLabel` (ex.: "Todos", selecionado quando nada está filtrado) e `inset`. É uma linha horizontal rolável.

```tsx
<ChipGroup allLabel="Todos" options={typeOptions} value={types} onChange={setTypes} />
```

### Badge
As props são `label`, `tone: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'`, `colorIndex` e `icon`.

### Banner
As props são `message`, `title`, `tone: 'info' | 'warning' | 'success' | 'danger'`, `icon`, `action: { label, onPress }` e `onDismiss`. Usa fundo suave e ícone, sem borda lateral. Fica no fluxo da tela: não é toast nem modal.

```tsx
<Banner tone="warning" title="Modo demonstração" message="Os dados ficam só neste aparelho e são de exemplo." />
```

### EmptyState
As props são `title`, `message`, `icon`, `action: { label, onPress, icon? }`, `secondaryAction` e `tone: 'neutral' | 'error'`.

### Divider
As props são `inset` (ex.: 72 para alinhar ao texto depois de um avatar) e `spacing`. É decorativo.

### Spinner / Skeleton
- **`Spinner`** aceita `size`, `color`, `label` e `fill` (centraliza na área). Tem papel `progressbar`.
- **`Skeleton`** aceita `width`, `height` e `radius`. **`SkeletonListItem`** é uma linha de lista pronta. Os dois ficam ocultos do leitor de tela e param com "Reduzir movimento".

### BottomSheet / ActionSheet
- **`BottomSheet`** aceita `visible`, `onClose`, `onDismissed`, `title`, `message` e `children`. Tocar no fundo ou usar o voltar do Android fecha.
- **`ActionSheet`** aceita `visible`, `onClose`, `title`, `options: { label, icon?, onPress, destructive?, disabled? }[]` e `cancelLabel="Cancelar"`. A ação escolhida roda **depois** que a sheet fecha, para não competir com o seletor de câmera ou galeria do sistema.

```tsx
<ActionSheet
  visible={open}
  onClose={() => setOpen(false)}
  title="Adicionar arquivo"
  options={[
    { label: 'Tirar foto', icon: 'camera-outline', onPress: takePhoto },
    { label: 'Escolher da galeria', icon: 'images-outline', onPress: pickImage },
    { label: 'Escolher arquivo (PDF)', icon: 'document-outline', onPress: pickFile },
  ]}
/>
```

### Utilitários exportados
`formatDate(iso, 'long' | 'short' | 'numeric' | 'monthYear')`, `parseISODate`, `toISODate`, `getInitials`, `categoricalIndexFor`, `sanitizeOtp`, `selectionFeedback`, `contrastRatio`, `FieldLabel`, `FieldMessage`.

---

## 5. Padrões de tela

| Padrão | Receita |
|---|---|
| **Lista** | Cabeçalho nativo com título grande no iOS. Abaixo, `SearchField` e `ChipGroup` de filtros (`allLabel="Todos"`). Depois, `FlatList` de `ListItem` ou `Card` com `tab`, agrupados por mês (`formatDate(d,'monthYear')` como `Text variant="title3"`). A ação principal fica num `Button` no rodapé ou no botão do cabeçalho. Use `Screen scroll={false} padded={false}`. |
| **Formulário** | `Screen` com `footer` contendo um único `Button` primary `fullWidth`. Os campos ficam empilhados com `layout.fieldGap` (20). Obrigatórios não levam marca; opcionais levam "(opcional)". Valide ao sair do campo ou ao enviar, nunca a cada tecla. Se houver erro, foque o primeiro campo inválido. |
| **Detalhe** | Um `Card tab={cor do tipo}` no topo com `Badge` do tipo, título (`title2`), data por extenso e profissional ou local. Abaixo, seções com `Text variant="title3"` e `ListItem`s (anexos com ícone de arquivo). Ações secundárias (compartilhar, editar) em `IconButton` no cabeçalho. Excluir fica num `Button variant="ghost"` com confirmação. |
| **Vazio** | `EmptyState` com uma frase que diz o que vai aparecer e uma ação: "Ainda não há documentos da Ana" / "Guarde aqui exames, receitas e vacinas." / [Adicionar documento]. |
| **Erro** | `EmptyState tone="error"`: "Não foi possível carregar" / "Verifique a conexão e tente de novo. Nada foi perdido." / [Tentar de novo]. Erros parciais aparecem como `Banner tone="danger"` no topo do conteúdo. |
| **Carregando** | Na primeira carga, 3–5 `SkeletonListItem` com o mesmo formato do conteúdo. Em ações (salvar, enviar), use `Button loading`. Use `Spinner fill` só onde não há como prever o formato. Nunca bloqueie a tela inteira por mais de um toque. |
| **Modo demo** | `Banner tone="warning" title="Modo demonstração"` no topo da tela inicial. Não é dispensável na sessão. |

---

## 6. Mapeamento recomendado: tipo de registro → cor/ícone

Este mapeamento deve ser implementado pelo Mobile em `src/entities/health-record/ui` (ex.: `recordTypeAppearance.ts`). O `shared/ui` não conhece `RecordType`.

| `RecordType` | Rótulo | Cor (`CategoricalIndex`) | Ícone (Ionicons) |
|---|---|---|---|
| `consultation` | Consulta | 0 · blue | `medkit-outline` |
| `exam` | Exame | 1 · teal | `flask-outline` |
| `result` | Resultado | 2 · green | `pulse-outline` |
| `report` | Laudo | 5 · violet | `document-text-outline` |
| `prescription` | Receita | 3 · amber | `clipboard-outline` |
| `vaccine` | Vacina | 4 · rose | `eyedrop-outline` |
| `other` | Outro | 6 · slate | `folder-open-outline` |

```ts
// src/entities/health-record/ui/recordTypeAppearance.ts (sugestão)
import type { CategoricalIndex, IconName } from '@/shared/ui';
import type { RecordType } from '../domain/health-record';

export const RECORD_TYPE_APPEARANCE: Record<RecordType, { colorIndex: CategoricalIndex; icon: IconName }> = {
  consultation: { colorIndex: 0, icon: 'medkit-outline' },
  exam: { colorIndex: 1, icon: 'flask-outline' },
  result: { colorIndex: 2, icon: 'pulse-outline' },
  report: { colorIndex: 5, icon: 'document-text-outline' },
  prescription: { colorIndex: 3, icon: 'clipboard-outline' },
  vaccine: { colorIndex: 4, icon: 'eyedrop-outline' },
  other: { colorIndex: 6, icon: 'folder-open-outline' },
};
```

Sempre mostre o **rótulo** junto (Badge, Chip, texto). A cor e o ícone ajudam a reconhecer, mas não substituem o texto.

---

## 7. Acessibilidade (obrigatório em toda tela)

1. **Contraste**: texto ≥4.5:1, texto grande e contorno de controle ≥3:1. Os tokens são testados. Ao criar uma combinação nova, adicione um caso em `tokens/tokens.test.ts`.
2. **Alvo de toque** ≥ `theme.minTouchTarget` (44 pt iOS / 48 dp Android). Elementos visualmente menores usam `hitSlop`.
3. **Dynamic Type**: não desligue `allowFontScaling`. Teste com a maior fonte de acessibilidade. Layouts com linhas lado a lado precisam quebrar (use `flexWrap` ou empilhe).
4. **Leitor de tela (VoiceOver/TalkBack)**: todo controle tem papel e rótulo em pt-BR. `IconButton` exige `accessibilityLabel`. Cards e linhas tocáveis são lidos como um único elemento, com rótulo completo ("Hemograma, exame, 12 de março de 2024"). Estados como selecionado, marcado, desabilitado e ocupado são anunciados pelos componentes.
5. **Erros** são anunciados (`liveRegion`) e ficam ligados ao campo pelo hint.
6. **Movimento**: respeite `theme.motion.reduced` em qualquer animação nova.
7. **Modo escuro**: toda cor vem de `theme.colors` ou `theme.categorical`. Não use hex na tela.
8. **Foco**: componentes interativos mostram `FocusRing` com teclado físico ou Switch Control.
9. **Nativo**: use o cabeçalho e o voltar do sistema, e seletores nativos (data, câmera, arquivos). Não reinvente gestos.

---

## 8. Tom de escrita (pt-BR)

Escreva como alguém da família que é organizado: calmo, direto, sem jargão técnico nem alarmismo.

| Faça | Evite |
|---|---|
| "Documento salvo." | "Sucesso!!" / "Operação realizada com êxito" |
| "Não foi possível enviar. Verifique a conexão e tente de novo." | "Erro 500" / "Falha na requisição" |
| "Confira a data: ela está no futuro." | "Data inválida" |
| "Ainda não há vacinas registradas para o Pedro." | "Nenhum resultado encontrado" |
| "Excluir este exame? Os arquivos anexados também serão apagados." | "Tem certeza?" |
| Botões com verbo + objeto: "Adicionar documento", "Tirar foto" | "OK", "Enviar", "Clique aqui" |
| "Seus dados ficam protegidos e só a sua família vê." | Linguagem jurídica ou de segurança assustadora |

- Use você, frases curtas e o nome da pessoa quando houver ("documentos da Ana").
- Datas por extenso em listas e detalhes ("12 de março de 2024"); numéricas (`02/03/2024`) só em espaço apertado.
- Sem exclamações, sem emoji na interface, sem MAIÚSCULAS para ênfase.
- Termos de saúde do dia a dia: "exame", "receita", "laudo", "vacina". Evite "prontuário eletrônico do paciente" ou siglas.
