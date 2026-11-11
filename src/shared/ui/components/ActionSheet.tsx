import { useCallback, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface ActionSheetOption {
  label: string;
  icon?: IconName;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  options: readonly ActionSheetOption[];
  /** Padrão "Cancelar". */
  cancelLabel?: string;
  testID?: string;
}

/**
 * Lista curta de ações ("Câmera / Galeria / Arquivo"). A ação escolhida roda depois que a folha
 * fecha, para não abrir câmera ou seletor por cima de um modal que ainda está saindo.
 */
export function ActionSheet({ visible, onClose, title, message, options, cancelLabel = 'Cancelar', testID }: ActionSheetProps) {
  const theme = useTheme();
  const pending = useRef<(() => void) | null>(null);

  const flush = useCallback(() => {
    const run = pending.current;
    pending.current = null;
    run?.();
  }, []);

  const choose = (option: ActionSheetOption) => {
    pending.current = option.onPress;
    onClose();
    // Garantia caso o onDismiss não venha (ex.: ambiente de testes).
    setTimeout(flush, Platform.OS === 'ios' ? 450 : 0);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} onDismissed={flush} title={title} message={message} testID={testID}>
      <View style={{ marginBottom: theme.space[3] }}>
        {options.map((opt) => {
          const color = opt.disabled ? 'textDisabled' : opt.destructive ? 'danger' : 'textPrimary';
          return (
            <Pressable
              key={opt.label}
              disabled={opt.disabled}
              onPress={() => choose(opt)}
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              accessibilityState={{ disabled: !!opt.disabled }}
              android_ripple={{ color: theme.colors.border }}
              style={({ pressed }) => [
                styles.option,
                { minHeight: 56, gap: theme.space[4], borderRadius: theme.radii.md, paddingHorizontal: theme.space[2] },
                pressed && Platform.OS !== 'android' && { backgroundColor: theme.colors.surfaceSunken },
              ]}
            >
              {opt.icon ? <Icon name={opt.icon} size={24} color={opt.destructive ? 'danger' : 'primary'} /> : null}
              <Text variant="body" color={color} style={styles.flex}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Button label={cancelLabel} variant="secondary" onPress={onClose} fullWidth />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
