import { View } from 'react-native';
import { useTheme } from '../theme';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

export interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  /** Diz o que acontece e se dá para desfazer ("Os arquivos anexados também serão apagados."). */
  message: string;
  /** Verbo + objeto ("Excluir registro"), nunca "OK". */
  confirmLabel: string;
  /** Padrão "Cancelar". */
  cancelLabel?: string;
  /** Ação irreversível: o botão de confirmar fica vermelho. */
  destructive?: boolean;
  /** Mantém a folha aberta e o botão ocupado enquanto a ação roda. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}

/**
 * Confirmação de ação importante (excluir, sair, revogar) numa BottomSheet. Substitui o `Alert` do sistema para
 * seguir o tom e os tokens do app e ser testável. A ação de menor risco ("Cancelar") vem sempre em segundo lugar na leitura,
 * mas com o mesmo peso de toque.
 */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
  testID,
}: ConfirmSheetProps) {
  const theme = useTheme();
  return (
    <BottomSheet visible={visible} onClose={loading ? () => undefined : onCancel} title={title} message={message} testID={testID}>
      <View style={{ gap: theme.space[3], paddingTop: theme.space[2] }}>
        <Button label={confirmLabel} variant={destructive ? 'destructive' : 'primary'} onPress={onConfirm} loading={loading} fullWidth />
        <Button label={cancelLabel} variant="secondary" onPress={onCancel} disabled={loading} fullWidth />
      </View>
    </BottomSheet>
  );
}
