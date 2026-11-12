// Passo "Lendo o documento…" (DESIGN.md › ScanProgress). Progresso por arquivo: o leitor não informa páginas.
// Nota: o ProgressSteps da F1 ainda não existe em @/shared/ui; a barra abaixo usa só View e tokens.
// Quando o ProgressSteps chegar, troque a barra por ele (props: progress 0..1, label, liveRegion).
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import { Button, Icon, Text, useTheme } from '@/shared/ui';

export interface ScanProgressProps {
  /** Arquivo em leitura (1..total), vindo de `onProgress` de readDocument. */
  current: number;
  total: number;
  /** Só foto; PDF mostra o ícone. */
  thumbnailUri?: string;
  onSkip(): void;
}

const TITLE = 'Lendo o documento…';

export function ScanProgress({ current, total, thumbnailUri, onSkip }: ScanProgressProps) {
  const theme = useTheme();
  const multiple = total > 1;
  const step = `${Math.min(Math.max(current, 1), total)} de ${total}`;

  // iOS não tem liveRegion: anuncia o início e cada arquivo.
  useEffect(() => {
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(multiple ? `${TITLE} ${step}` : TITLE);
  }, [multiple, step]);

  return (
    <View style={[styles.box, { padding: theme.space[6], gap: theme.space[4] }]} testID="scan-progress">
      <View style={[styles.thumb, { backgroundColor: theme.colors.surfaceSunken, borderRadius: theme.radii.md }]}>
        {thumbnailUri ? (
          <Image source={{ uri: thumbnailUri }} style={styles.image} contentFit="cover" accessibilityIgnoresInvertColors />
        ) : (
          <Icon name="scan" size={34} color="textSecondary" />
        )}
      </View>
      <View accessibilityLiveRegion="polite" style={[styles.center, { gap: theme.space[2] }]}>
        <Text variant="title3" align="center">
          {TITLE}
        </Text>
        {multiple ? (
          <>
            <View
              style={[styles.track, { backgroundColor: theme.colors.surfaceSunken }]}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={`Arquivo ${step}`}
              accessibilityValue={{ min: 0, max: total, now: current }}
            >
              <View style={[styles.fill, { width: `${(Math.min(current, total) / total) * 100}%`, backgroundColor: theme.colors.primary }]} />
            </View>
            <Text variant="footnote" color="secondary" align="center" tabular>
              {step}
            </Text>
          </>
        ) : null}
      </View>
      <Text variant="footnote" color="secondary" align="center">
        Lido no aparelho, sem internet.
      </Text>
      <Button label="Pular leitura" variant="plain" onPress={onSkip} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center', maxWidth: 400, width: '100%' },
  center: { alignItems: 'center', alignSelf: 'stretch' },
  thumb: { width: 96, height: 120, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  track: { height: 4, borderRadius: 2, alignSelf: 'stretch', overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
});
