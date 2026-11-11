import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { Text } from './Text';

/** Alturas de repouso. 'half' ≈ metade da tela, 'full' = tela cheia. Sem detents, ajusta ao conteúdo. */
export type BottomSheetDetent = 'half' | 'full';

export interface BottomSheetProps {
  visible: boolean;
  /** Toque no véu, botão Voltar do Android ou ação de cancelar. */
  onClose: () => void;
  /** Disparado depois que a folha terminou de fechar (bom momento para abrir câmera/galeria). */
  onDismissed?: () => void;
  title?: string;
  /** Ajuda opcional abaixo do título. */
  message?: string;
  /** v2: alturas de repouso (iOS: presentationDetents; Android: a folha fica na altura do conteúdo). */
  detents?: readonly BottomSheetDetent[];
  children?: ReactNode;
  testID?: string;
}

/**
 * Folha que sobe da base para uma tarefa curta e autocontida. Fecha no véu e no Voltar.
 * Android/web: folha modal Material 3 (cantos de 28, alça de arraste). iOS: ver BottomSheet.ios.tsx.
 */
export function BottomSheet({ visible, onClose, onDismissed, title, message, children, testID }: BottomSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [translate] = useState(() => new Animated.Value(theme.motion.reduced ? 0 : 32));
  const wasVisible = useRef(visible);

  useEffect(() => {
    if (visible) {
      translate.setValue(theme.motion.reduced ? 0 : 32);
      const [x1, y1, x2, y2] = theme.motion.easing.out;
      Animated.timing(translate, {
        toValue: 0,
        duration: theme.motion.reduced ? 0 : theme.motion.duration.slow,
        easing: Easing.bezier(x1, y1, x2, y2),
        useNativeDriver: true,
      }).start();
    } else if (wasVisible.current && Platform.OS !== 'ios') {
      // iOS avisa por onDismiss do Modal; nas outras plataformas o fechamento é imediato.
      onDismissed?.();
    }
    wasVisible.current = visible;
  }, [visible, translate, theme.motion, onDismissed]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={onDismissed}
      statusBarTranslucent
      navigationBarTranslucent
      testID={testID}
    >
      <View style={styles.container}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: theme.space[3],
              paddingHorizontal: theme.layout.screenGutter,
              paddingBottom: Math.max(insets.bottom, theme.space[4]) + theme.space[2],
              transform: [{ translateY: translate }],
            },
            theme.elevation(3),
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.borderStrong }]} />
          {title ? (
            <Text variant="title3" style={{ marginBottom: message ? theme.space[1] : theme.space[4] }}>
              {title}
            </Text>
          ) : null}
          {message ? (
            <Text variant="subheadline" color="secondary" style={{ marginBottom: theme.space[4] }}>
              {message}
            </Text>
          ) : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  handle: { width: 32, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16, opacity: 0.6 },
});
