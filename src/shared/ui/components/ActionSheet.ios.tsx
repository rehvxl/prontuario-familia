import { ConfirmationDialog, Host, Button as SwiftButton, Text as SwiftText } from '@expo/ui/swift-ui';
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import type { ActionSheetOption, ActionSheetProps } from './ActionSheet';

export type { ActionSheetOption, ActionSheetProps } from './ActionSheet';

/**
 * iOS: `confirmationDialog` do SwiftUI (folha de ações do sistema; no iOS 26 sai do ponto de toque com
 * vidro). Ícones não aparecem — é a convenção do sistema. A ação escolhida roda depois da animação de
 * saída, para não abrir câmera/galeria por cima do diálogo.
 */
export function ActionSheet({ visible, onClose, title, message, options, cancelLabel = 'Cancelar', testID }: ActionSheetProps) {
  const theme = useTheme();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const choose = (opt: ActionSheetOption) => {
    onClose();
    timer.current = setTimeout(opt.onPress, 350);
  };

  return (
    <Host style={styles.host} pointerEvents="none" colorScheme={theme.scheme} testID={testID}>
      <ConfirmationDialog
        title={title ?? ''}
        titleVisibility={title ? 'visible' : 'hidden'}
        isPresented={visible}
        onIsPresentedChange={(presented) => {
          if (!presented && visible) onClose();
        }}
      >
        <ConfirmationDialog.Trigger>
          <SwiftText> </SwiftText>
        </ConfirmationDialog.Trigger>
        <ConfirmationDialog.Actions>
          {options
            .filter((o) => !o.disabled)
            .map((opt) => (
              <SwiftButton
                key={opt.label}
                label={opt.label}
                role={opt.destructive ? 'destructive' : 'default'}
                onPress={() => choose(opt)}
              />
            ))}
          <SwiftButton label={cancelLabel} role="cancel" onPress={onClose} />
        </ConfirmationDialog.Actions>
        {message ? (
          <ConfirmationDialog.Message>
            <SwiftText>{message}</SwiftText>
          </ConfirmationDialog.Message>
        ) : null}
      </ConfirmationDialog>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', width: 1, height: 1, bottom: 0, alignSelf: 'center' },
});
