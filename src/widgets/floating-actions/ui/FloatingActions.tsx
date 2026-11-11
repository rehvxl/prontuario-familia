import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banner, FloatingActionButton, useTheme, type IconName } from '@/shared/ui';

export interface FloatingActionsProps {
  /** Rede parada: mostra o aviso flutuante "Sem conexão". */
  offline?: boolean;
  /** Modo demonstração: pílula discreta (some ao dispensar). */
  demo?: boolean;
  onDismissDemo?: () => void;
  /** Ação primária da tela (FAB estendido). Omitida quando não há o que criar. */
  action?: { label: string; icon?: IconName; onPress: () => void; testID?: string } | null;
  /** Altura ocupada na base (avisos + FAB + folga), para somar ao `paddingBottom` da lista. */
  onOccupiedChange?: (occupied: number) => void;
}

/**
 * Camada flutuante da tela (avisos em vidro + FAB), posicionada na base, acima da barra de abas.
 * Informa a altura ocupada para a lista rolar além dela e a última linha nunca ficar coberta.
 */
export function FloatingActions({ offline = false, demo = false, onDismissDemo, action, onOccupiedChange }: FloatingActionsProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom + theme.space[3];
  const onLayout = (e: LayoutChangeEvent) => onOccupiedChange?.(Math.ceil(e.nativeEvent.layout.height) + bottom);

  if (!offline && !demo && !action) return null;
  return (
    <View pointerEvents="box-none" style={[styles.layer, { bottom, paddingHorizontal: theme.layout.screenGutter, gap: theme.space[3] }]} onLayout={onLayout}>
      {offline ? (
        <Banner appearance="floating" tone="warning" icon="offline" message="Sem conexão. Mostrando o que já foi carregado." testID="offline-banner" />
      ) : null}
      {demo ? (
        <Banner appearance="floating" tone="info" icon="flask" message="Modo demonstração" onDismiss={onDismissDemo} testID="demo-pill" />
      ) : null}
      {action ? <FloatingActionButton extended icon={action.icon ?? 'add'} label={action.label} onPress={action.onPress} testID={action.testID} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0 },
});
