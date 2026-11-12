import type { GestureResponderEvent, StyleProp, ViewStyle } from 'react-native';
import type { ColorTokens } from '../tokens';
import type { IconName } from './Icon';

/**
 * Estilos v2 (iOS 26 / Material 3):
 * - `glassProminent`: ação principal da tela, sobre a camada de controles (Liquid Glass tingido no iOS; "filled" no Android).
 * - `glass`: ação secundária flutuante (Liquid Glass claro no iOS; "tonal" no Android).
 * - `filled`: ação principal dentro do conteúdo (borderedProminent no iOS; filled no Android).
 * - `bordered`: ação secundária dentro do conteúdo (bordered no iOS; tonal no Android).
 * - `plain`: ação terciária, só texto (plain no iOS; text button no Android).
 *
 * Aliases v1: primary → filled, secondary → bordered, ghost → plain, destructive → filled + role destructive.
 */
export type ButtonStyleName = 'glassProminent' | 'glass' | 'filled' | 'bordered' | 'plain';
/** @deprecated nomes v1 — veja a tabela de migração em docs/DESIGN_SYSTEM.md. */
export type LegacyButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonVariant = ButtonStyleName | LegacyButtonVariant;
/** md = 52 pt (padrão, pensado em 60+); sm = altura mínima de toque da plataforma (44/48). */
export type ButtonSize = 'md' | 'sm';
export type ButtonRole = 'default' | 'destructive' | 'cancel';

export interface ButtonProps {
  /** Texto do botão: um verbo que nomeia a ação ("Salvar registro", não "OK"). */
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  /** Papel semântico. `destructive` pinta de vermelho e o leitor de tela avisa. */
  role?: ButtonRole;
  size?: ButtonSize;
  icon?: IconName;
  iconPosition?: 'start' | 'end';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export interface ResolvedButtonStyle {
  style: ButtonStyleName;
  role: ButtonRole;
}

export function resolveButtonStyle(variant: ButtonVariant, role: ButtonRole = 'default'): ResolvedButtonStyle {
  switch (variant) {
    case 'primary':
      return { style: 'filled', role };
    case 'secondary':
      return { style: 'bordered', role };
    case 'ghost':
      return { style: 'plain', role };
    case 'destructive':
      return { style: 'filled', role: 'destructive' };
    default:
      return { style: variant, role };
  }
}

/** Evento sintético para chamadas vindas do nativo/acessibilidade (onPress mantém a assinatura v1). */
export const syntheticPress = { nativeEvent: {} } as unknown as GestureResponderEvent;

/** Estilos SwiftUI "proeminentes": fundo cheio no tint, rótulo sobre ele. */
export type SwiftProminentStyle = 'glassProminent' | 'borderedProminent';

/**
 * Cor do rótulo de um botão SwiftUI proeminente (`glassProminent`/`borderedProminent`).
 * O SwiftUI pinta o rótulo de branco por padrão, sem olhar o tint. No escuro o `primary` (#6E9EFF)
 * é claro, e o vidro ainda o clareia (medido: #7BAEFF), então o branco fica com ~2,2:1 (BUG-05).
 * O rótulo usa o token "on" da cor de fundo, como no Android: `onPrimary`/`onDanger` (≥ 4,5:1 nos dois temas).
 */
export function prominentForeground(colors: ColorTokens, role: ButtonRole = 'default'): string {
  return role === 'destructive' ? colors.onDanger : colors.onPrimary;
}
