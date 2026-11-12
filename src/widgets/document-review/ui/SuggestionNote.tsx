import { StyleSheet, View } from 'react-native';
import { Text, quoteEvidence, useTheme, type Confidence } from '@/shared/ui';

/** Confiança sempre em palavras (nunca porcentagem): mesmo texto do `SuggestedField`. */
export const CONFIDENCE_TEXT: Readonly<Record<Confidence, { text: string; spoken: string }>> = {
  high: { text: 'Leitura alta', spoken: 'confiança alta' },
  medium: { text: 'Leitura média', spoken: 'confiança média' },
  low: { text: 'Confira', spoken: 'confiança baixa, confira' },
};

export interface SuggestionNoteProps {
  confidence: Confidence;
  /** Linha do documento de onde veio a sugestão. */
  evidence?: string;
  testID?: string;
}

/**
 * Selo "Sugestão" (A7), medidor de confiança e trecho lido para campos que não são texto livre (tipo e data,
 * que usam `Select` e `DateField`). Some quando a pessoa escolhe outro valor.
 */
export function SuggestionNote({ confidence, evidence, testID }: SuggestionNoteProps) {
  const theme = useTheme();
  const low = confidence === 'low';
  const c = CONFIDENCE_TEXT[confidence];
  const bars = confidence === 'high' ? 3 : confidence === 'medium' ? 2 : 1;
  return (
    <View
      accessible
      accessibilityLabel={['Sugestão da leitura', c.spoken, evidence ? `trecho lido: ${evidence}` : null].filter(Boolean).join(', ')}
      style={{ gap: theme.space[1], marginTop: theme.space[2] }}
      testID={testID}
    >
      <View style={[styles.row, { gap: theme.space[2] }]}>
        <View style={[styles.badge, { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radii.control }]}>
          <Text variant="caption" color="onPrimarySoft" style={styles.strong}>
            Sugestão
          </Text>
        </View>
        <View style={[styles.row, { gap: 2 }]}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.bar, { backgroundColor: i < bars ? (low ? theme.colors.clinicalHigh : theme.colors.primary) : theme.colors.rangeTrack }]}
            />
          ))}
        </View>
        <Text variant="footnote" color={low ? 'clinicalHigh' : 'secondary'}>
          {c.text}
        </Text>
      </View>
      {evidence ? (
        // Trecho lido entre aspas, na fonte do texto (sem monoespaçado), como no `SuggestedField` (A9).
        <Text variant="footnote" color="secondary">
          {quoteEvidence(evidence)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  badge: { paddingHorizontal: 9, paddingVertical: 1 },
  strong: { fontWeight: '600' },
  bar: { width: 5, height: 12, borderRadius: 1 },
});
