import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';

/** Barra de status legível sobre a divisória enquanto a tela está em foco; volta ao automático ao sair. */
export function useBoardStatusBar(style: 'light' | 'dark' | null) {
  useFocusEffect(
    useCallback(() => {
      if (!style) return undefined;
      setStatusBarStyle(style);
      return () => setStatusBarStyle('auto');
    }, [style]),
  );
}
