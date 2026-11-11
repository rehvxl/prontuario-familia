import Ionicons from '@expo/vector-icons/Ionicons';
import type { ColorTokens } from '../tokens';
import { useTheme } from '../theme';

/** Nome de ícone (conjunto Ionicons: traço consistente, versões outline e cheia). */
export type IconName = keyof typeof Ionicons.glyphMap;
export type ColorRole = keyof ColorTokens;

export interface IconProps {
  name: IconName;
  /** Tamanho em pt. Padrão 24. */
  size?: number;
  /** Papel de cor do tema (ex.: 'textSecondary') ou cor literal. Padrão 'textPrimary'. */
  color?: ColorRole | (string & {});
  /** Se informado, o ícone é anunciado como imagem. Sem rótulo, é decorativo e fica oculto do leitor de tela. */
  accessibilityLabel?: string;
  testID?: string;
}

export function resolveColor(colors: ColorTokens, color: string): string {
  return (colors as unknown as Record<string, string>)[color] ?? color;
}

export function Icon({ name, size = 24, color = 'textPrimary', accessibilityLabel, testID }: IconProps) {
  const theme = useTheme();
  const decorative = !accessibilityLabel;
  return (
    <Ionicons
      name={name}
      size={size}
      color={resolveColor(theme.colors, color)}
      allowFontScaling={false}
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      testID={testID}
    />
  );
}

/**
 * Ícones genéricos recomendados (shared/ui não conhece o domínio; o mapeamento por tipo de registro
 * fica em entities/health-record/ui — veja docs/DESIGN_SYSTEM.md).
 */
export const icons = {
  add: 'add',
  back: 'chevron-back',
  forward: 'chevron-forward',
  close: 'close',
  check: 'checkmark',
  search: 'search',
  filter: 'options-outline',
  calendar: 'calendar-outline',
  camera: 'camera-outline',
  gallery: 'images-outline',
  file: 'document-outline',
  fileText: 'document-text-outline',
  attach: 'attach-outline',
  share: 'share-outline',
  download: 'download-outline',
  edit: 'create-outline',
  trash: 'trash-outline',
  person: 'person-outline',
  people: 'people-outline',
  settings: 'settings-outline',
  lock: 'lock-closed-outline',
  shield: 'shield-checkmark-outline',
  info: 'information-circle-outline',
  warning: 'warning-outline',
  error: 'alert-circle-outline',
  success: 'checkmark-circle-outline',
  stethoscope: 'medkit-outline',
  flask: 'flask-outline',
  pulse: 'pulse-outline',
  clipboard: 'clipboard-outline',
  pill: 'bandage-outline',
  shot: 'eyedrop-outline',
  folder: 'folder-open-outline',
  more: 'ellipsis-horizontal',
  logout: 'log-out-outline',
  mail: 'mail-outline',
} as const satisfies Record<string, IconName>;
