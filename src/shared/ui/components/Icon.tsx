import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolView, type AndroidSymbol, type SFSymbol, type SymbolWeight } from 'expo-symbols';
import { Platform, useWindowDimensions } from 'react-native';
import type { ColorTokens } from '../tokens';
import { useTheme } from '../theme';
import { useIconScale } from '../lib/a11y';

/**
 * Ícones: SF Symbols no iOS, Material Symbols Outlined no Android (via expo-symbols), peso regular.
 * Use sempre um nome semântico (`'add'`, `'record.exam'`); o mapa decide o glifo de cada plataforma.
 */
export interface NativeIconSpec {
  /** SF Symbol (contorno). */
  sf: SFSymbol;
  /** SF Symbol preenchido, para estado selecionado (abas). */
  sfSelected?: SFSymbol;
  /** Material Symbol (snake_case). */
  md: AndroidSymbol;
}

const spec = (sf: SFSymbol, md: AndroidSymbol, sfSelected?: SFSymbol): NativeIconSpec => ({ sf, md, sfSelected });

/** Mapa semântico → {sf, md}. Fonte única dos ícones do app. */
export const ICON_MAP = {
  // Ações
  add: spec('plus', 'add'),
  addCircle: spec('plus.circle.fill', 'add_circle'),
  back: spec('chevron.backward', 'arrow_back'),
  forward: spec('chevron.forward', 'chevron_right'),
  expand: spec('chevron.down', 'expand_more'),
  close: spec('xmark', 'close'),
  closeCircle: spec('xmark.circle.fill', 'cancel'),
  check: spec('checkmark', 'check'),
  search: spec('magnifyingglass', 'search'),
  filter: spec('line.3.horizontal.decrease', 'filter_list'),
  sort: spec('arrow.up.arrow.down', 'sort'),
  edit: spec('pencil', 'edit'),
  trash: spec('trash', 'delete'),
  share: spec('square.and.arrow.up', 'share'),
  download: spec('arrow.down.circle', 'download'),
  attach: spec('paperclip', 'attach_file'),
  camera: spec('camera', 'photo_camera'),
  gallery: spec('photo.on.rectangle', 'photo_library'),
  scan: spec('doc.viewfinder', 'document_scanner'),
  refresh: spec('arrow.clockwise', 'refresh'),
  more: spec('ellipsis', 'more_horiz'),
  moreCircle: spec('ellipsis.circle', 'more_horiz'),
  logout: spec('rectangle.portrait.and.arrow.right', 'logout'),
  mail: spec('envelope', 'mail'),
  visible: spec('eye', 'visibility'),
  hidden: spec('eye.slash', 'visibility_off'),
  // Objetos
  calendar: spec('calendar', 'calendar_today'),
  file: spec('doc', 'draft'),
  fileText: spec('doc.text', 'description'),
  folder: spec('folder', 'folder_open', 'folder.fill'),
  person: spec('person', 'person', 'person.fill'),
  personCircle: spec('person.crop.circle', 'account_circle'),
  personAdd: spec('person.badge.plus', 'person_add'),
  people: spec('person.2', 'group', 'person.2.fill'),
  home: spec('house', 'home', 'house.fill'),
  settings: spec('gearshape', 'settings', 'gearshape.fill'),
  lock: spec('lock', 'lock'),
  shield: spec('checkmark.shield', 'verified_user'),
  hand: spec('hand.raised', 'front_hand'),
  offline: spec('icloud.slash', 'cloud_off'),
  // Estados
  info: spec('info.circle', 'info'),
  warning: spec('exclamationmark.triangle', 'warning'),
  error: spec('exclamationmark.circle', 'error'),
  success: spec('checkmark.circle', 'check_circle'),
  successFill: spec('checkmark.circle.fill', 'check_circle'),
  // Saúde (genéricos; o mapeamento por tipo de registro fica em entities/health-record/ui)
  stethoscope: spec('stethoscope', 'stethoscope'),
  flask: spec('flask', 'science'),
  pulse: spec('waveform.path.ecg', 'monitor_heart'),
  clipboard: spec('list.clipboard', 'assignment'),
  pill: spec('pills', 'medication'),
  shot: spec('syringe', 'vaccines'),
  medical: spec('cross.case', 'medical_services'),
  // v3 (DESIGN.md › Iconography)
  trend: spec('chart.xyaxis.line', 'monitoring'),
  bloodPressure: spec('heart', 'ecg_heart'),
  glucose: spec('drop', 'water_drop'),
  weight: spec('scalemass', 'monitor_weight'),
  height: spec('ruler', 'height'),
  pills: spec('pills', 'medication'),
  scanDocument: spec('doc.text.viewfinder', 'document_scanner'),
  stateIn: spec('checkmark.circle', 'check_circle'),
  // v4: setas soltas (como no esboço da pasta); o círculo fica para "dentro" e "sem faixa".
  stateHigh: spec('arrow.up', 'arrow_upward'),
  stateLow: spec('arrow.down', 'arrow_downward'),
  stateNone: spec('minus.circle', 'do_not_disturb_on'),
  privacy: spec('lock', 'lock'),
  // v4
  clock: spec('clock', 'schedule'),
} as const satisfies Record<string, NativeIconSpec>;

export type SemanticIconName = keyof typeof ICON_MAP;

/** Nomes Ionicons do v1 ainda em uso → nome semântico. */
const LEGACY_ALIASES = {
  add: 'add',
  'add-circle': 'addCircle',
  'add-outline': 'add',
  'chevron-back': 'back',
  'chevron-forward': 'forward',
  'chevron-down': 'expand',
  close: 'close',
  'close-circle': 'closeCircle',
  'close-circle-outline': 'closeCircle',
  checkmark: 'check',
  'checkmark-circle': 'successFill',
  'checkmark-circle-outline': 'success',
  search: 'search',
  'search-outline': 'search',
  'options-outline': 'filter',
  'funnel-outline': 'filter',
  'calendar-outline': 'calendar',
  'camera-outline': 'camera',
  'images-outline': 'gallery',
  'document-outline': 'file',
  'document-text-outline': 'fileText',
  'attach-outline': 'attach',
  'share-outline': 'share',
  'download-outline': 'download',
  'create-outline': 'edit',
  'trash-outline': 'trash',
  'person-outline': 'person',
  'person-circle-outline': 'personCircle',
  'person-add-outline': 'personAdd',
  'people-outline': 'people',
  settings: 'settings',
  'settings-outline': 'settings',
  'lock-closed-outline': 'lock',
  'shield-checkmark-outline': 'shield',
  'information-circle': 'info',
  'information-circle-outline': 'info',
  warning: 'warning',
  'warning-outline': 'warning',
  'alert-circle': 'error',
  'alert-circle-outline': 'error',
  'medkit-outline': 'stethoscope',
  'flask-outline': 'flask',
  'pulse-outline': 'pulse',
  'clipboard-outline': 'clipboard',
  'bandage-outline': 'pill',
  'eyedrop-outline': 'shot',
  'folder-open-outline': 'folder',
  'ellipsis-horizontal': 'more',
  'log-out-outline': 'logout',
  'mail-outline': 'mail',
  'refresh-outline': 'refresh',
  'cloud-offline-outline': 'offline',
  'hand-left-outline': 'hand',
} as const satisfies Record<string, SemanticIconName>;

/** @deprecated v1 — nome de glifo Ionicons. Use um `SemanticIconName`; ver tabela de migração. */
export type LegacyIconName = keyof typeof Ionicons.glyphMap;

/** Nome de ícone: semântico (recomendado) ou Ionicons (v1, ainda aceito). */
export type IconName = SemanticIconName | LegacyIconName;
export type ColorRole = keyof ColorTokens;

export interface IconProps {
  name: IconName;
  /** Tamanho em pt. Padrão 22 (alinha com o corpo de 17 pt; SF Symbols são mais largos que Ionicons). */
  size?: number;
  /** Papel de cor do tema (ex.: 'textSecondary') ou cor literal. Padrão 'textPrimary'. */
  color?: ColorRole | (string & {});
  /** Peso do SF Symbol (iOS). Padrão 'regular'; use 'semibold' ao lado de texto em negrito. */
  weight?: SymbolWeight;
  /** Usa a variante preenchida (iOS), quando existir. */
  filled?: boolean;
  /** Se informado, o ícone é anunciado como imagem. Sem rótulo, é decorativo e fica oculto do leitor de tela. */
  accessibilityLabel?: string;
  /**
   * Ícone ao lado de texto (estado, legenda): `size` cresce com o tamanho de texto do sistema, até 2×
   * (`useIconScale`). Deixe false em botões e caixas de tamanho fixo.
   */
  scaleWithText?: boolean;
  testID?: string;
}

export function resolveColor(colors: ColorTokens, color: string): string {
  return (colors as unknown as Record<string, string>)[color] ?? color;
}

/** Resolve um nome (semântico ou legado) para o par nativo. `undefined` se for um Ionicon sem equivalente. */
export function resolveIcon(name: IconName): NativeIconSpec | undefined {
  if (name in ICON_MAP) return ICON_MAP[name as SemanticIconName];
  const alias = (LEGACY_ALIASES as Record<string, SemanticIconName>)[name];
  return alias ? ICON_MAP[alias] : undefined;
}

/**
 * Par `{ sf, md }` para APIs nativas do expo-router que recebem nomes de símbolo diretamente:
 * `<NativeTabs.Trigger.Icon {...nativeIcon('people', { selected: true })} />`,
 * `<Stack.Toolbar.Button icon={nativeIcon('add').sf} />`.
 */
export function nativeIcon(
  name: IconName,
  options: { selected?: boolean } = {},
): { sf: SFSymbol | { default: SFSymbol; selected: SFSymbol }; md: AndroidSymbol } {
  const resolved = resolveIcon(name) ?? ICON_MAP.more;
  const sf =
    options.selected && resolved.sfSelected ? { default: resolved.sf, selected: resolved.sfSelected } : resolved.sf;
  return { sf, md: resolved.md };
}

export function Icon({
  name,
  size: baseSize = 22,
  color = 'textPrimary',
  weight = 'regular',
  filled = false,
  accessibilityLabel,
  scaleWithText = false,
  testID,
}: IconProps) {
  const theme = useTheme();
  const iconScale = useIconScale();
  const { fontScale } = useWindowDimensions();
  const size = scaleWithText ? Math.round(baseSize * iconScale) : baseSize;
  const decorative = !accessibilityLabel;
  const tint = resolveColor(theme.colors, color);
  const a11y = {
    accessible: !decorative,
    accessibilityRole: decorative ? undefined : ('image' as const),
    accessibilityLabel,
    accessibilityElementsHidden: decorative,
    importantForAccessibility: decorative ? ('no-hide-descendants' as const) : ('yes' as const),
    testID,
  };
  const resolved = resolveIcon(name);
  if (!resolved) {
    // Glifo Ionicons sem equivalente semântico: mantém o v1 para não quebrar telas.
    return (
      <Ionicons name={name as LegacyIconName} size={size} color={tint} allowFontScaling={false} {...a11y} />
    );
  }
  const sf = filled && resolved.sfSelected ? resolved.sfSelected : resolved.sf;
  // expo-symbols no Android desenha o glifo como <Text fontSize={size}> numa caixa size×size sem desligar a
  // escala de fonte do sistema: em AX o glifo dobra e é cortado (FAB vazio, relógio em cunha). Compensa a escala
  // no tamanho do glifo e mantém a caixa no tamanho pedido.
  const glyph = Platform.OS === 'android' ? size / fontScale : size;
  return (
    <SymbolView
      name={{ ios: sf, android: resolved.md, web: resolved.md }}
      size={glyph}
      style={Platform.OS === 'android' ? { width: size, height: size } : undefined}
      tintColor={tint}
      weight={Platform.OS === 'ios' ? weight : undefined}
      resizeMode="scaleAspectFit"
      {...a11y}
    />
  );
}

/**
 * Atalhos v1 (`icons.add`) — agora apontam para nomes semânticos. Prefira escrever o nome direto.
 */
export const icons = {
  add: 'add',
  back: 'back',
  forward: 'forward',
  close: 'close',
  check: 'check',
  search: 'search',
  filter: 'filter',
  calendar: 'calendar',
  camera: 'camera',
  gallery: 'gallery',
  file: 'file',
  fileText: 'fileText',
  attach: 'attach',
  share: 'share',
  download: 'download',
  edit: 'edit',
  trash: 'trash',
  person: 'person',
  people: 'people',
  settings: 'settings',
  lock: 'lock',
  shield: 'shield',
  info: 'info',
  warning: 'warning',
  error: 'error',
  success: 'success',
  stethoscope: 'stethoscope',
  flask: 'flask',
  pulse: 'pulse',
  clipboard: 'clipboard',
  pill: 'pill',
  shot: 'shot',
  folder: 'folder',
  more: 'more',
  logout: 'logout',
  mail: 'mail',
} as const satisfies Record<string, SemanticIconName>;
