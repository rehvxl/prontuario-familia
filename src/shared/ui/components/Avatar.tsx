import { Image } from 'expo-image';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { categoricalIndexFor, getInitials } from '../lib/identity';
import { Text } from './Text';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
const SIZES: Record<AvatarSize, number> = { xs: 24, sm: 32, md: 44, lg: 56, xl: 80 };

export interface AvatarProps {
  name: string;
  /** Id estável (ex.: id do membro). Define a cor da divisória — a mesma pessoa tem sempre a mesma cor. */
  id: string;
  size?: AvatarSize;
  /** Foto opcional (URL ou arquivo local). */
  imageUri?: string | null;
  /** @deprecated v3 (anel). Na v4 a capa já é a cor plena da pessoa; aceito e ignorado. */
  ring?: boolean;
  /** Por padrão o avatar é decorativo (o nome já aparece ao lado). Passe true quando estiver sozinho. */
  accessible?: boolean;
  testID?: string;
}

/**
 * Capa da pessoa (v4): um cartão de divisória na cor plena dela (`personBoard`), cantos de aba à direita,
 * iniciais em Archivo Bold em `onBoard` (≥ 4,5:1). Com foto, a foto no mesmo recorte.
 */
export function Avatar({ name, id, size = 'md', imageUri, accessible = false, testID }: AvatarProps) {
  const theme = useTheme();
  const px = SIZES[size];
  const hue = theme.personBoard(categoricalIndexFor(id));
  const fontSize = Math.round(px * 0.4);
  const small = Math.max(3, Math.round(px * 0.1));
  const tab = Math.max(6, Math.round(px * 0.28));
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
        borderTopLeftRadius: small,
        borderBottomLeftRadius: small,
        borderTopRightRadius: tab,
        borderBottomRightRadius: tab,
        borderCurve: 'continuous',
        backgroundColor: hue.board,
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
          style={{ color: hue.onBoard, fontSize, lineHeight: Math.round(fontSize * 1.2), fontWeight: '700' }}
        >
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}
