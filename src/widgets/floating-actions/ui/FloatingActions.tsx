import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banner, FloatingActionButton, useRailAsStrip, useTheme, type IconName } from '@/shared/ui';

export interface FloatingActionsProps {
  /** Rede parada: mostra o aviso flutuante sólido "Sem conexão · mostrando o que já está salvo" (DESIGN_SYSTEM.md §7.1). */
  offline?: boolean;
  /** Ação primária da tela (FAB estendido). Omitida quando não há o que criar. */
  action?: { label: string; icon?: IconName; onPress: () => void; testID?: string } | null;
  /** v4: a tela tem a régua de abas na borda direita. A camada para antes dela, para não cobrir as abas de baixo. */
  rail?: boolean;
}

/** Escala de fonte a partir da qual o botão estendido não cabe na largura: vira só o ícone (como o `ListItem`). */
export const FAB_ICON_ONLY_FONT_SCALE = 1.35;

/**
 * Camada flutuante da tela (aviso offline sólido + FAB sólido na tinta da divisória, v4), na base, acima da barra de abas.
 * Fora da `Screen`, envolva em `HueProvider` para o FAB seguir a pessoa.
 * A lista reserva a altura com `useFloatingFooterInset(floatingFooterOf(props))`, para a última linha rolar acima dela.
 * O modo demonstração não flutua: é o `DemoBadge` no fluxo da tela.
 */
export function FloatingActions({ offline = false, action, rail = false }: FloatingActionsProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom + theme.space[3];
  // Com Dynamic Type de acessibilidade (AX1+) o rótulo ao lado do ícone passa da borda da tela (BUG-08):
  // mostra só o ícone. O rótulo continua sendo o nome acessível do botão.
  const iconOnly = useWindowDimensions().fontScale >= FAB_ICON_ONLY_FONT_SCALE;
  // Com texto ≥ 1,35× a régua vira faixa no topo e a borda direita fica livre.
  const strip = useRailAsStrip();
  const railRight = rail && !strip ? theme.layout.railWidth : 0;

  if (!offline && !action) return null;
  return (
    <View pointerEvents="box-none" style={[styles.layer, { bottom, paddingLeft: theme.layout.screenGutter, paddingRight: railRight ? railRight + theme.space[3] : theme.layout.screenGutter, gap: theme.space[3] }]}>
      {offline ? (
        <Banner appearance="floating" tone="warning" icon="offline" message="Sem conexão · mostrando o que já está salvo" testID="offline-banner" />
      ) : null}
      {action ? <FloatingActionButton extended={!iconOnly} icon={action.icon ?? 'add'} label={action.label} onPress={action.onPress} testID={action.testID} /> : null}
    </View>
  );
}

/** O que a camada põe na base, no formato do `useFloatingFooterInset` (mesmas props que a tela passa à camada). */
export const floatingFooterOf = ({ offline = false, action }: FloatingActionsProps) => ({ fab: !!action, pills: offline ? 1 : 0 });

const styles = StyleSheet.create({
  // Acima da folha (que tem zIndex 1 para cobrir a régua) e, no Android, acima da elevação dela.
  layer: { position: 'absolute', left: 0, right: 0, zIndex: 10, elevation: 10 },
});
