import { Image } from 'expo-image';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { categoricalIndexFor, getInitials } from '../lib/identity';
import { Text } from './Text';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
const SIZES: Record<AvatarSize, number> = { sm: 32, md: 44, lg: 56, xl: 80 };

export interface AvatarProps {
  name: string;
  /** Id estável (ex.: id do membro). Define a cor — a mesma pessoa tem sempre a mesma cor. */
  id: string;
  size?: AvatarSize;
  /** Foto opcional (URL ou arquivo local). */
  imageUri?: string | null;
  /** Por padrão o avatar é decorativo (o nome já aparece ao lado). Passe true quando estiver sozinho. */
  accessible?: boolean;
  testID?: string;
}

export function Avatar({ name, id, size = 'md', imageUri, accessible = false, testID }: AvatarProps) {
  const theme = useTheme();
  const px = SIZES[size];
  const color = theme.categorical[categoricalIndexFor(id)] ?? theme.categorical[0];
  const fontSize = Math.round(px * 0.4);
  return (
    <View
      accessible={accessible}
      accessibilityRole={accessible ? 'image' : undefined}
      accessibilityLabel={accessible ? name : undefined}
      importantForAccessibility={accessible ? 'yes' : 'no-hide-descendants'}
      accessibilityElementsHidden={!accessible}
      testID={testID}
      style={{
        width: px,
        height: px,
        borderRadius: px / 2,
        backgroundColor: color?.main,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={{ width: px, height: px }} contentFit="cover" accessible={false} />
      ) : (
        <Text
          allowFontScaling={false}
          style={{ color: color?.onMain, fontSize, lineHeight: Math.round(fontSize * 1.2), fontWeight: '600' }}
        >
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}
