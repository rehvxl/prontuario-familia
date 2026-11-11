import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';

/** Estado de foco (teclado/controle externo, Android TV, iPad com teclado). */
export function useFocusState() {
  const [focused, setFocused] = useState(false);
  const onFocus = useCallback(() => setFocused(true), []);
  const onBlur = useCallback(() => setFocused(false), []);
  return { focused, onFocus, onBlur };
}

/** Anel de foco desenhado 3 pt para fora do controle, sem mexer no layout. */
export function FocusRing({ visible, radius }: { visible: boolean; radius: number }) {
  const theme = useTheme();
  if (!visible) return null;
  return (
    <View
      pointerEvents="none"
      style={[styles.ring, { borderColor: theme.colors.focusRing, borderRadius: radius + 3 }]}
    />
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderWidth: 2 },
});
