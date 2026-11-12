import { Platform, PlatformColor, type ColorValue } from 'react-native';
import {
  boardSwap,
  fontFamily,
  fontFamilyFor,
  fontFamilyMedium,
  normalizeWeight,
  palettes,
  type CategoricalColor,
  type HueName,
  type HueTokens,
  type ColorScheme,
  type ColorTokens,
  type ElevationLevel,
  elevationStyle,
  duration,
  easing,
  layout,
  radii,
  space,
  spring,
  typography,
} from '../tokens';

/**
 * Cores para o que acompanha o sistema (cabeçalho, separadores, rótulos de células nativas).
 * Fundos (`background`, `groupedBackground`, `surface`) são sempre o hex do tema (a folha leitosa v4),
 * porque o sistema não tem esse tom. `label`, `secondaryLabel`, `separator` e `fill` continuam
 * PlatformColor no iOS (respondem a "Aumentar contraste"). No Android e nos testes, os hex do tema.
 */
export interface NativeColors {
  background: ColorValue;
  groupedBackground: ColorValue;
  surface: ColorValue;
  label: ColorValue;
  secondaryLabel: ColorValue;
  separator: ColorValue;
  fill: ColorValue;
  tint: ColorValue;
}

/** Estado do Liquid Glass para esta sessão. `enabled` é o que os componentes devem usar. */
export interface GlassState {
  /** `isGlassEffectAPIAvailable()`: iOS 26+ com a API exposta. */
  available: boolean;
  /** Ajustes › Acessibilidade › Reduzir transparência. */
  reduceTransparency: boolean;
  /** available && !reduceTransparency. Quando false, use superfície sólida. */
  enabled: boolean;
}

export interface Theme {
  scheme: ColorScheme;
  colors: ColorTokens;
  categorical: readonly CategoricalColor[];
  /**
   * v4: a divisória atual. Fora de `HueProvider`/`DividerBoard`/`Screen board`, a da família (ultramar).
   * `colors.primary*`, `focusRing` e `rangeBand` já seguem este matiz.
   */
  hue: HueTokens;
  /** v4: todos os matizes do tema atual. `people[i]` = pessoa de índice `categoricalIndexFor(id)`. */
  hues: { family: HueTokens; people: readonly HueTokens[]; byName: Readonly<Record<HueName, HueTokens>> };
  /** v4: matiz da pessoa de índice `index` (use `categoricalIndexFor(member.id)`). Estável por id. */
  personBoard: (index: number) => HueTokens;
  /** v4: família da fonte por peso. Archivo SemiCondensed; com `fontsLoaded` false, a do sistema. */
  font: (weight?: string | number) => string;
  /** v4: a Archivo está disponível (plugin do expo-font ou `useFonts` no UiProvider). */
  fontsLoaded: boolean;
  /** Cores do sistema (PlatformColor no iOS). */
  native: NativeColors;
  typography: typeof typography;
  space: typeof space;
  layout: typeof layout;
  radii: typeof radii;
  elevation: (level: ElevationLevel) => ReturnType<typeof elevationStyle>;
  motion: {
    duration: typeof duration;
    easing: typeof easing;
    spring: typeof spring;
    /** v4: troca de divisória (90 ms, 2 quadros, sem easing). */
    boardSwap: typeof boardSwap;
    /** "Reduzir movimento" do sistema. */
    reduced: boolean;
  };
  glass: GlassState;
  /** Área mínima de toque: 44 pt (iOS) / 48 dp (Android). */
  minTouchTarget: number;
}

export interface CreateThemeOptions {
  reducedMotion?: boolean;
  glassAvailable?: boolean;
  reduceTransparency?: boolean;
  /** Padrão true. Com false, `theme.font()` devolve a fonte do sistema. */
  fontsLoaded?: boolean;
}

const isJest = typeof process !== 'undefined' && process.env?.JEST_WORKER_ID !== undefined;

function nativeColors(colors: ColorTokens): NativeColors {
  if (Platform.OS === 'ios' && !isJest) {
    return {
      background: colors.background,
      groupedBackground: colors.background,
      surface: colors.surface,
      label: PlatformColor('label'),
      secondaryLabel: PlatformColor('secondaryLabel'),
      separator: PlatformColor('separator'),
      fill: PlatformColor('tertiarySystemFill'),
      tint: colors.primary,
    };
  }
  return {
    background: colors.background,
    groupedBackground: colors.background,
    surface: colors.surface,
    label: colors.textPrimary,
    secondaryLabel: colors.textSecondary,
    separator: colors.border,
    fill: colors.surfaceSunken,
    tint: colors.primary,
  };
}

export function createTheme(scheme: ColorScheme, options: CreateThemeOptions = {}): Theme {
  const { colors, categorical, hues } = palettes[scheme];
  const available = options.glassAvailable ?? false;
  const reduceTransparency = options.reduceTransparency ?? false;
  const fontsLoaded = options.fontsLoaded ?? true;
  const [family, ...people] = hues as [HueTokens, ...HueTokens[]];
  const byName = Object.fromEntries(hues.map((h) => [h.name, h])) as Record<HueName, HueTokens>;
  return {
    scheme,
    colors,
    categorical,
    hue: family,
    hues: { family, people, byName },
    personBoard: (index) => people[((Math.trunc(index) % people.length) + people.length) % people.length] ?? family,
    font: (weight) => {
      const w = normalizeWeight(weight as never);
      if (fontsLoaded) return fontFamilyFor(w);
      return w === '400' ? fontFamily : fontFamilyMedium;
    },
    fontsLoaded,
    native: nativeColors(colors),
    typography,
    space,
    layout,
    radii,
    elevation: (level) => elevationStyle(scheme, level, colors.border),
    motion: { duration, easing, spring, boardSwap, reduced: options.reducedMotion ?? false },
    glass: { available, reduceTransparency, enabled: available && !reduceTransparency },
    minTouchTarget: Platform.OS === 'android' ? 48 : 44,
  };
}

/**
 * v4: o mesmo tema com a divisória `hue` (nome ou tokens): `primary*`, `focusRing`, `rangeBand` e
 * `native.tint` passam a ser a tinta da pessoa. Resolve pelo nome no esquema do tema (claro/escuro).
 */
export function withHue(theme: Theme, hue: HueName | HueTokens): Theme {
  const h = theme.hues.byName[typeof hue === 'string' ? hue : hue.name] ?? theme.hues.family;
  if (h === theme.hue) return theme;
  const colors: ColorTokens = {
    ...theme.colors,
    primary: h.ink,
    primaryPressed: h.inkPressed,
    onPrimary: h.onInk,
    primarySoft: h.soft,
    onPrimarySoft: h.ink,
    focusRing: h.ink,
    rangeBand: h.soft,
  };
  return { ...theme, hue: h, colors, native: { ...theme.native, tint: h.ink } };
}

/**
 * v4: o tema dentro da folha (`Leaf`): `background` passa a ser `hue.leaf` (92% de branco sobre a divisória),
 * para o que pinta "a cor da folha" (pontos vazados do gráfico, véu, marcador da régua) casar com ela.
 */
export function onLeaf(theme: Theme): Theme {
  const leaf = theme.hue.leaf;
  if (theme.colors.background === leaf) return theme;
  return {
    ...theme,
    colors: { ...theme.colors, background: leaf },
    native: { ...theme.native, background: leaf, groupedBackground: leaf },
  };
}

export const lightTheme = createTheme('light');
export const darkTheme = createTheme('dark');

export interface HeaderOptionsConfig {
  /**
   * Título grande (iOS) que encolhe ao rolar. Padrão true. Use false em telas modais ou de passo
   * (formulários de cadastro), onde o título pequeno centralizado é a convenção.
   */
  largeTitle?: boolean;
  /**
   * Cabeçalho transparente, o conteúdo passa por baixo e o sistema aplica o material (Liquid Glass
   * no iOS 26). Só ligue em telas cujo conteúdo rola com `contentInsetAdjustmentBehavior="automatic"`
   * (Screen com scroll, ou FlatList/SectionList com `nativeScrollProps`). Padrão false.
   */
  transparent?: boolean;
  /**
   * Tela-raiz que desenha o título no conteúdo (`Screen heading`). O cabeçalho nativo fica só com os
   * botões: sem título grande e sem texto de título. Sem `board`, transparente no iOS (vidro do sistema no 26).
   * Padrão false.
   */
  contentTitle?: boolean;
  /**
   * v4: cabeçalho sobre a divisória (use com `Screen board`/`DividerBoard`). O cabeçalho fica opaco na cor
   * plena da divisória, com título e botões em `onBoard`, sem sombra; a folha começa logo abaixo dele.
   * Tela-raiz sem botões: prefira `headerShown: false` e `Screen board edges={['top', …]}` (folha logo
   * abaixo da barra de status, como no esboço).
   */
  board?: HueName | HueTokens;
}

/**
 * Opções de cabeçalho para o Stack do expo-router, sem acoplar shared/ui à navegação:
 * `<Stack screenOptions={headerOptions(theme)} />`.
 *
 * iOS: título grande nativo, sem sombra, fundo da folha; com `transparent`, Liquid Glass do sistema
 * (iOS 26) ou blur (iOS < 26). Títulos na cor de texto do sistema (`label`) e na Archivo; o tint
 * (`primary`, a tinta da divisória) fica só nos botões. Atenção: no expo-router, `headerTintColor` sem
 * cor de título explícita pinta o título com o tint. Se sobrescrever `headerTintColor`, espalhe
 * `headerOptions` antes ou use `headerTitleColors(theme)` junto.
 * Android: top app bar do Material 3 (fundo da folha, título 20 sp na Archivo, sem sombra).
 * Com `board`: nos dois, cabeçalho opaco na cor da divisória, título e botões em `onBoard`.
 */
export function headerOptions(theme: Theme, config: HeaderOptionsConfig = {}) {
  const { contentTitle = false } = config;
  const board = config.board ? withHue(theme, config.board).hue : undefined;
  const largeTitle = contentTitle || board ? false : (config.largeTitle ?? true);
  const transparent = !board && (contentTitle || (config.transparent ?? false));
  const hiddenTitle = contentTitle ? { headerTitle: '' } : {};
  const titles = headerTitleStyles(theme, board);
  if (Platform.OS === 'ios') {
    const bg = board ? board.board : theme.native.groupedBackground;
    return {
      headerLargeTitle: largeTitle,
      headerLargeTitleShadowVisible: false,
      headerShadowVisible: false,
      headerTransparent: transparent,
      // No iOS 26 o sistema já aplica o Liquid Glass; blur junto gera o aviso de efeitos sobrepostos do RNScreens.
      headerBlurEffect: transparent && !theme.glass.available ? ('systemChromeMaterial' as const) : undefined,
      headerStyle: transparent ? undefined : { backgroundColor: bg },
      headerLargeStyle: transparent ? undefined : { backgroundColor: bg },
      headerTintColor: board ? board.onBoard : theme.colors.primary,
      ...titles,
      headerBackButtonDisplayMode: 'minimal' as const,
      contentStyle: { backgroundColor: bg },
      ...hiddenTitle,
    };
  }
  const bg = board ? board.board : theme.colors.background;
  const fg = board ? board.onBoard : theme.colors.textPrimary;
  return {
    headerShadowVisible: false,
    headerTransparent: false,
    headerStyle: { backgroundColor: bg },
    headerTintColor: fg,
    headerTitleStyle: { ...titles.headerTitleStyle, fontSize: 20 },
    headerTitleAlign: 'left' as const,
    contentStyle: { backgroundColor: bg },
    ...hiddenTitle,
  };
}

/**
 * Cor do título do cabeçalho nativo: texto do sistema (`label` no iOS, que segue escuro e "Aumentar
 * contraste"; textPrimary no Android). Para layouts com `screenOptions` próprios que definem `headerTintColor`.
 */
export function headerTitleColors(theme: Theme) {
  const color = Platform.OS === 'ios' ? theme.native.label : theme.colors.textPrimary;
  return { headerTitleStyle: { color }, headerLargeTitleStyle: { color } };
}

/**
 * v4: cor + fonte do título do cabeçalho (Archivo SemiBold no título, Bold no grande). Sobre uma
 * divisória (`board`), o título vai em `onBoard`.
 */
export function headerTitleStyles(theme: Theme, board?: HueTokens) {
  const colors = headerTitleColors(theme);
  const color = board ? board.onBoard : colors.headerTitleStyle.color;
  return {
    headerTitleStyle: { color, fontFamily: theme.font('600') },
    headerLargeTitleStyle: { color, fontFamily: theme.font('700') },
  };
}

/**
 * Props para FlatList/SectionList/ScrollView próprios ficarem corretos sob o cabeçalho nativo
 * (título grande, cabeçalho transparente e barra de abas flutuante do iOS 26).
 */
export const nativeScrollProps = {
  contentInsetAdjustmentBehavior: 'automatic' as const,
  automaticallyAdjustsScrollIndicatorInsets: true,
  keyboardDismissMode: 'interactive' as const,
};
