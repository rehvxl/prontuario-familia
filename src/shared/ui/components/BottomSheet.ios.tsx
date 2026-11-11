import { BottomSheet as SwiftSheet, Group, Host, RNHostView } from '@expo/ui/swift-ui';
import {
  padding,
  presentationBackground,
  presentationDetents,
  presentationDragIndicator,
  type ModifierConfig,
} from '@expo/ui/swift-ui/modifiers';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import type { BottomSheetProps } from './BottomSheet';
import { Text } from './Text';

export type { BottomSheetDetent, BottomSheetProps } from './BottomSheet';

/**
 * iOS: folha nativa do SwiftUI (`.sheet` com `presentationDetents`). Sem `detents`, ajusta à altura do
 * conteúdo. Fundo de vidro do sistema no iOS 26; com "Reduzir transparência"/iOS < 26, superfície sólida.
 * O conteúdo continua sendo React Native (via RNHostView).
 */
export function BottomSheet({ visible, onClose, onDismissed, title, message, detents, children, testID }: BottomSheetProps) {
  const theme = useTheme();
  const wasVisible = useRef(visible);
  useEffect(() => {
    if (wasVisible.current && !visible && onDismissed) {
      // A folha nativa leva ~0,35 s para sair; o próximo modal só pode subir depois.
      const t = setTimeout(onDismissed, 400);
      wasVisible.current = visible;
      return () => clearTimeout(t);
    }
    wasVisible.current = visible;
    return undefined;
  }, [visible, onDismissed]);

  const modifiers: ModifierConfig[] = [
    padding({ top: 24, leading: 0, trailing: 0, bottom: 0 }),
    presentationDragIndicator('visible'),
  ];
  if (detents?.length) {
    modifiers.push(presentationDetents(detents.map((d) => (d === 'half' ? 'medium' : 'large'))));
  }
  if (!theme.glass.enabled) modifiers.push(presentationBackground(theme.colors.surfaceRaised));

  return (
    <Host style={styles.host} pointerEvents="none" colorScheme={theme.scheme}>
      <SwiftSheet
        isPresented={visible}
        onIsPresentedChange={(presented) => {
          if (!presented && visible) onClose();
        }}
        fitToContents={!detents?.length}
        testID={testID}
      >
        <Group modifiers={modifiers}>
          <RNHostView matchContents={{ vertical: true }}>
            <View
              accessibilityViewIsModal
              style={{ paddingHorizontal: theme.layout.screenGutter, paddingBottom: theme.space[4] }}
            >
              {title ? (
                <Text variant="title3" accessibilityRole="header" style={{ marginBottom: message ? theme.space[1] : theme.space[4] }}>
                  {title}
                </Text>
              ) : null}
              {message ? (
                <Text variant="subheadline" color="secondary" style={{ marginBottom: theme.space[4] }}>
                  {message}
                </Text>
              ) : null}
              {children}
            </View>
          </RNHostView>
        </Group>
      </SwiftSheet>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute' },
});
