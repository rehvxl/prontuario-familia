import type { IconName } from './Icon';

export interface FloatingActionButtonProps {
  icon: IconName;
  /** Obrigatório: lido pelo leitor de tela e usado como rótulo na versão estendida. */
  label: string;
  onPress: () => void;
  /** Mostra o rótulo ao lado do ícone (FAB estendido). Padrão false. */
  extended?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
}
