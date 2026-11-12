import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { ColorTokens } from '../tokens';
import { useTheme } from '../theme';
import { Icon, type IconName } from './Icon';

export interface IconTileProps {
  icon: IconName;
  /** Papel de cor do fundo (ex.: 'clinicalHighSoft') ou cor literal. Padrão 'surfaceSunken'. */
  background?: keyof ColorTokens | (string & {});
  /** Papel de cor do ícone ou cor literal. Padrão 'textSecondary'. */
  color?: keyof ColorTokens | (string & {});
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Tile de ícone 36 × 36 pt, raio 10 (v3), para `leading` de `ListItem`. Decorativo. */
export function IconTile({ icon, background = 'surfaceSunken', color = 'textSecondary', style, testID }: IconTileProps) {
  const theme = useTheme();
  const bg = (theme.colors as unknown as Record<string, string>)[background] ?? background;
  return (
    <View
      testID={testID}
      style={[
        { width: 36, height: 36, borderRadius: theme.radii.tile, borderCurve: 'continuous', backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      <Icon name={icon} size={20} color={color} />
    </View>
  );
}
