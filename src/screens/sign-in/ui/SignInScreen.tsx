import { useState } from 'react';
import { Platform, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { DEMO_OTP_CODE, useAuthProviders } from '@/entities/session';
import { isAuthCancelled, useRequestEmailCode, useSignInWithApple, useSignInWithGoogle } from '@/features/auth';
import { Banner, Button, Chip, Screen, Text, TextField, errorMessage, useTheme } from '@/shared/ui';

/** Login sem senha: e-mail → código. Apple (só iOS) e Google aparecem quando o aparelho/ambiente oferece. `demo` mostra o código de teste. */
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

  const sendCode = () =>
    requestCode.mutate(email, {
      onSuccess: (normalized) => router.push({ pathname: '/(auth)/verify', params: { email: normalized } }),
    });

  return (
    <Screen
      testID="sign-in-screen"
      edges={["top", "left", "right", "bottom"]}
      footer={
        <Button label="Enviar código" onPress={sendCode} loading={requestCode.isPending} disabled={email.trim() === '' || busy} fullWidth />
      }
    >
      <Text variant="title1">Entrar</Text>
      <Text color="secondary" style={{ marginTop: theme.space[2], marginBottom: theme.space[6] }}>
        Vamos enviar um código de 6 dígitos para o seu e-mail. Sem senha para lembrar.
      </Text>
      {demo ? (
        <View style={{ alignSelf: 'flex-start', marginBottom: theme.space[4] }} testID="demo-banner">
          <Chip icon="flask" label={`Modo demonstração · código ${DEMO_OTP_CODE}`} />
        </View>
      ) : null}
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
        testID="email-input"
      />
      {showApple || showGoogle ? (
        <View style={{ marginTop: theme.space[8], gap: theme.space[3] }}>
          <Text variant="footnote" color="secondary" align="center">
            ou continue com
          </Text>
          {showApple ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={theme.scheme === 'dark' ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={theme.radii.md}
              style={{ height: 52 }}
              onPress={() => apple.mutate()}
            />
          ) : null}
          {showGoogle ? <Button label="Continuar com o Google" variant="bordered" onPress={() => google.mutate()} disabled={busy} fullWidth /> : null}
          {socialError ? <Banner tone="danger" message={errorMessage(socialError, 'Não foi possível entrar. Tente novamente.')} /> : null}
        </View>
      ) : null}
    </Screen>
  );
}
