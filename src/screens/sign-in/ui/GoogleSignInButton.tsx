import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text, useTheme } from '@/shared/ui';

/**
 * Cores do botão "Continuar com o Google" pelas diretrizes de marca do Google Identity (botão neutro claro/escuro).
 * São da marca, não do tema: as diretrizes não permitem retingir o botão nem o "G".
 */
const GOOGLE_BRAND = {
  light: { background: '#FFFFFF', border: '#747775', text: '#1F1F1F' },
  dark: { background: '#131314', border: '#8E918F', text: '#E3E3E3' },
  g: { red: '#EA4335', blue: '#4285F4', yellow: '#FBBC05', green: '#34A853' },
} as const;

export interface GoogleSignInButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Mesmo raio do botão da Apple, para os dois casarem. */
  cornerRadius: number;
  height: number;
}

/** Botão de marca do Google: "G" multicolor à esquerda, texto "Continuar com o Google", fundo neutro. */
export function GoogleSignInButton({ onPress, disabled = false, loading = false, cornerRadius, height }: GoogleSignInButtonProps) {
  const theme = useTheme();
  const c = GOOGLE_BRAND[theme.scheme === 'dark' ? 'dark' : 'light'];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continuar com o Google"
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      onPress={onPress}
      testID="google-sign-in"
      style={({ pressed }) => [
        styles.button,
        { minHeight: height, borderRadius: cornerRadius, backgroundColor: c.background, borderColor: c.border, gap: theme.space[3], paddingHorizontal: theme.space[4] },
        (pressed || off) && styles.dim,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.text} />
      ) : (
        <View style={styles.mark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Svg width={18} height={18} viewBox="0 0 48 48">
            <Path fill={GOOGLE_BRAND.g.red} d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <Path fill={GOOGLE_BRAND.g.blue} d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <Path fill={GOOGLE_BRAND.g.yellow} d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <Path fill={GOOGLE_BRAND.g.green} d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </Svg>
        </View>
      )}
      {/* Texto médio da plataforma (SF/Roboto), como pedem as diretrizes, e não a Archivo do app; cresce com o Dynamic Type. */}
      <Text variant="headline" style={[styles.label, { color: c.text }]}>
        Continuar com o Google
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  dim: { opacity: 0.6 },
  mark: { width: 18, height: 18 },
  // A família explícita vence a Archivo que o `Text` escolhe pelo peso.
  label: { fontFamily: Platform.select({ ios: 'System', default: 'sans-serif-medium' }), fontWeight: '500', textAlign: 'center', flexShrink: 1 },
});
