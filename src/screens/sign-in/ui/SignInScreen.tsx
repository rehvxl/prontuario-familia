import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DEMO_OTP_CODE, useAuthProviders } from '@/entities/session';
import { isAuthCancelled, useRequestEmailCode, useSignInWithApple, useSignInWithGoogle } from '@/features/auth';
import { Banner, Button, Divider, Screen, Text, TextField, errorMessage, useTheme } from '@/shared/ui';
import { GoogleSignInButton } from './GoogleSignInButton';

/** Altura dos botões de provedor: a mesma dos botões do app (52 pt), para alinhar com "Enviar código". */
const PROVIDER_HEIGHT = 52;

/**
 * Login sem senha: e-mail → código. Apple (botão do sistema, só iOS) e Google (botão de marca) aparecem quando o
 * aparelho/ambiente oferece. `demo` mostra o selo discreto com o código de teste.
 * v4: sem cabeçalho, a folha começa logo abaixo da barra de status, sobre a capa ultramar.
 */
export function SignInScreen({ demo }: { demo: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const requestCode = useRequestEmailCode();
  const apple = useSignInWithApple();
  const google = useSignInWithGoogle();
  const providers = useAuthProviders().data ?? [];
  const showApple = Platform.OS === 'ios' && providers.includes('apple');
  const showGoogle = providers.includes('google');
  const busy = requestCode.isPending || apple.isPending || google.isPending;

  const socialError = [apple.error, google.error].find((e) => e && !isAuthCancelled(e));
  const emailError = requestCode.error ? errorMessage(requestCode.error, 'Não foi possível enviar o código. Tente novamente.') : null;
  const radius = PROVIDER_HEIGHT / 2;

  const sendCode = () =>
    requestCode.mutate(email, {
      onSuccess: (normalized) => router.push({ pathname: '/(auth)/verify', params: { email: normalized } }),
    });

  return (
    <Screen
      testID="sign-in-screen"
      board="ultramar"
      edges={['top', 'left', 'right', 'bottom']}
      heading={{ title: 'Entrar' }}
      footer={
        <Button label="Enviar código" onPress={sendCode} loading={requestCode.isPending} disabled={email.trim() === '' || busy} fullWidth />
      }
    >
      <StatusBar style={theme.hues.family.statusBar} />
      {demo ? <DemoSeal /> : null}
      <Text color="secondary" style={{ marginBottom: theme.space[6] }}>
        Vamos enviar um código de 6 dígitos para o seu e-mail. Sem senha para lembrar.
      </Text>
      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={sendCode}
        error={emailError}
        disabled={busy}
        autoFocus
        testID="email-input"
      />
      {showApple || showGoogle ? (
        <View style={{ marginTop: theme.space[8], gap: theme.space[3] }}>
          <View style={[styles.or, { gap: theme.space[3] }]}>
            <View style={styles.flex}><Divider /></View>
            <Text variant="footnote" color="secondary">
              ou continue com
            </Text>
            <View style={styles.flex}><Divider /></View>
          </View>
          {showApple ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={theme.scheme === 'dark' ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={radius}
              style={{ height: PROVIDER_HEIGHT }}
              onPress={() => apple.mutate()}
            />
          ) : null}
          {showGoogle ? (
            <GoogleSignInButton onPress={() => google.mutate()} disabled={busy} loading={google.isPending} cornerRadius={radius} height={PROVIDER_HEIGHT} />
          ) : null}
          {socialError ? <Banner tone="danger" message={errorMessage(socialError, 'Não foi possível entrar. Tente novamente.')} /> : null}
        </View>
      ) : null}
    </Screen>
  );
}

/**
 * Selo do modo demonstração, no fluxo abaixo do título: cápsula `caption` no `soft` da divisória. Quebra linha
 * em vez de cortar (o código de teste precisa ficar legível com texto grande), por isso não é o `Badge`.
 */
function DemoSeal() {
  const theme = useTheme();
  return (
    <View
      testID="demo-banner"
      accessible
      style={[styles.seal, { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radii.control, paddingHorizontal: theme.space[3], paddingVertical: theme.space[1], marginBottom: theme.space[4] }]}
    >
      <Text variant="caption" color="onPrimarySoft" tabular>
        {`Modo demonstração · código ${DEMO_OTP_CODE}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  or: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  seal: { alignSelf: 'flex-start' },
});
