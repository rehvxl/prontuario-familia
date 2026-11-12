import { useState } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import type { Confidence } from './clinical';
import { IconButton } from './IconButton';
import { Text } from './Text';

export interface SuggestedFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** 'ocr' = sugestão da leitura (selo "Sugestão" e medidor); 'user' = escolhida pela pessoa; 'default' = padrão. */
  origin: 'ocr' | 'user' | 'default';
  confidence?: Confidence;
  /** Trecho lido no documento ("Coletado em 03/11/2026"). */
  sourceHint?: string;
  /** Padrão true. */
  editable?: boolean;
  required?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const CONFIDENCE: Record<Confidence, { bars: number; text: string; spoken: string }> = {
  high: { bars: 3, text: 'Leitura alta', spoken: 'confiança alta' },
  medium: { bars: 2, text: 'Leitura média', spoken: 'confiança média' },
  low: { bars: 1, text: 'Confira', spoken: 'confiança baixa, confira' },
};

/** Trecho lido do documento, entre aspas tipográficas (sem monoespaçada: é citação, não código). */
export const quoteEvidence = (text: string) => `“${text.trim()}”`;

/** Rótulo do leitor: "Profissional, Dra. Paula Lima, sugestão da leitura, confiança baixa, confira". */
export function suggestedFieldLabel({ label, value, origin, confidence, required }: Pick<SuggestedFieldProps, 'label' | 'value' | 'origin' | 'confidence' | 'required'>): string {
  const parts = [label, value || 'vazio'];
  if (required) parts.push('obrigatório');
  if (origin === 'ocr') {
    parts.push('sugestão da leitura');
    if (confidence) parts.push(CONFIDENCE[confidence].spoken);
  }
  if (origin === 'user') parts.push('escolhida por você');
  return parts.join(', ');
}

/**
 * Campo preenchido pela leitura do documento. O selo "Sugestão" (A7) e o medidor de confiança (3 barras,
 * nunca porcentagem) ficam enquanto `origin` for 'ocr'; quem usa troca para 'user' quando a pessoa edita.
 */
export function SuggestedField({ label, value, onChange, origin, confidence, sourceHint, editable = true, required, style, testID }: SuggestedFieldProps) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const ocr = origin === 'ocr';
  const low = ocr && confidence === 'low';
  const c = ocr && confidence ? CONFIDENCE[confidence] : undefined;
  return (
    <View style={[{ gap: theme.space[1] }, style]} testID={testID}>
      <View style={[styles.row, { gap: theme.space[2] }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text variant="footnote" color="secondary" style={styles.label}>
          {label}
        </Text>
        {ocr ? (
          <View style={[styles.badge, { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radii.control }]}>
            <Text variant="caption" color="onPrimarySoft" style={styles.strong}>
              Sugestão
            </Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.row, { gap: theme.space[2] }]}>
        {editing ? (
          <TextInput
            autoFocus
            value={value}
            onChangeText={onChange}
            onBlur={() => setEditing(false)}
            onSubmitEditing={() => setEditing(false)}
            accessibilityLabel={label}
            allowFontScaling
            style={[
              styles.input,
              {
                fontFamily: theme.font('400'),
                fontSize: theme.typography.body.fontSize,
                color: theme.colors.textPrimary,
                borderColor: theme.colors.primary,
                borderRadius: theme.radii.field,
                minHeight: theme.minTouchTarget,
                paddingHorizontal: theme.space[3],
              },
            ]}
          />
        ) : (
          <View accessible accessibilityLabel={suggestedFieldLabel({ label, value, origin, confidence, required })} style={styles.value}>
            <Text
              variant="body"
              color={value ? 'primary' : 'tertiary'}
              style={low ? { textDecorationLine: 'underline', textDecorationColor: theme.colors.clinicalHigh } : undefined}
            >
              {value || '—'}
            </Text>
          </View>
        )}
        {editable && !editing ? <IconButton icon="edit" color="primary" iconSize={20} accessibilityLabel="Editar" onPress={() => setEditing(true)} /> : null}
      </View>
      {c ? (
        <View style={[styles.row, { gap: theme.space[2] }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.row, { gap: 2 }]}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  width: 5,
                  height: 12,
                  borderRadius: 1,
                  backgroundColor: i < c.bars ? (low ? theme.colors.clinicalHigh : theme.colors.primary) : theme.colors.rangeTrack,
                }}
              />
            ))}
          </View>
          <Text variant="footnote" color={low ? 'clinicalHigh' : 'secondary'}>
            {c.text}
          </Text>
        </View>
      ) : null}
      {origin === 'user' ? (
        <Text variant="footnote" color="secondary">
          Escolhida por você
        </Text>
      ) : null}
      {ocr && sourceHint ? (
        <Text variant="footnote" color="secondary" testID={testID ? `${testID}-evidence` : undefined}>
          {quoteEvidence(sourceHint)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontWeight: '500', flexShrink: 1 },
  badge: { paddingHorizontal: 9, paddingVertical: 1 },
  strong: { fontWeight: '600' },
  value: { flex: 1, minHeight: 44, justifyContent: 'center' },
  input: { flex: 1, borderWidth: 2 },
});
