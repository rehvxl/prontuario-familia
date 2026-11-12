import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DEMO_OTP_CODE } from '@/entities/session';
import { OTP_LENGTH, useRequestEmailCode, useVerifyEmailCode } from '@/features/auth';
import { Banner, Button, OtpInput, Screen, Text, errorMessage, headerOptions, useTheme } from '@/shared/ui';

export const RESEND_SECONDS = 60;

/** "0:42": contagem do reenvio em minutos e segundos (tabular). */
export const formatCountdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Contagem regressiva em segundos; `restart` recomeça. */
function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return { left, restart: () => setLeft(seconds) };
}

/**
 * Segundo passo do login: código de 6 dígitos. Ao acertar, a guarda de navegação leva ao próximo passo.
 * v4: a mesma folha do login sobre a capa ultramar, com o cabeçalho (voltar) opaco na cor da família.
 */
export function VerifyCodeScreen({ demo }: { demo: boolean }) {
  const theme = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';
  const [code, setCode] = useState('');
  const verify = useVerifyEmailCode();
  const resend = useRequestEmailCode();
  const countdown = useCountdown(RESEND_SECONDS);
  const [resent, setResent] = useState(false);

  const submit = (value: string) => {
    if (value.length === OTP_LENGTH && !verify.isPending) verify.mutate({ email, code: value });
  };
  const onResend = () =>
    resend.mutate(email, {
      onSuccess: () => {
        setResent(true);
        setCode('');
        verify.reset();
        countdown.restart();
      },
    });

  const codeError = verify.error ? errorMessage(verify.error, 'Não foi possível confirmar o código. Tente novamente.') : null;

  return (
    <Screen
      testID="verify-code-screen"
      board="ultramar"
      heading={{ title: 'Digite o código' }}
      footer={
        <Button label="Confirmar código" onPress={() => submit(code)} loading={verify.isPending} disabled={code.length !== OTP_LENGTH} fullWidth />
      }
    >
      <Stack.Screen options={headerOptions(theme, { board: 'ultramar' })} />
      <StatusBar style={theme.hues.family.statusBar} />
      {demo ? (
        <View
          testID="demo-banner"
          accessible
          style={[styles.seal, { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radii.control, paddingHorizontal: theme.space[3], paddingVertical: theme.space[1], marginBottom: theme.space[4] }]}
        >
          <Text variant="caption" color="onPrimarySoft" tabular>
            {`Modo demonstração · código ${DEMO_OTP_CODE}`}
          </Text>
        </View>
      ) : null}
      <Text color="secondary" style={{ marginBottom: theme.space[6] }}>
        {email ? `Enviamos um código de ${OTP_LENGTH} dígitos para ${email}.` : `Digite o código de ${OTP_LENGTH} dígitos que enviamos por e-mail.`}
      </Text>
      <OtpInput value={code} onChange={setCode} onComplete={submit} error={codeError} disabled={verify.isPending} autoFocus testID="otp-input" />
      <View style={{ marginTop: theme.space[6], alignItems: 'center', gap: theme.space[2] }}>
        {resent ? (
          <Text variant="footnote" color="secondary">
            Enviamos um novo código.
          </Text>
        ) : null}
        {resend.error ? <Banner tone="danger" message={errorMessage(resend.error, 'Não foi possível reenviar o código.')} /> : null}
        <Button
          label={countdown.left > 0 ? `Reenviar em ${formatCountdown(countdown.left)}` : 'Reenviar código'}
          accessibilityLabel={countdown.left > 0 ? `Reenviar código em ${countdown.left} segundos` : 'Reenviar código'}
          variant="plain"
          onPress={onResend}
          disabled={countdown.left > 0 || resend.isPending}
          loading={resend.isPending}
          testID="resend-button"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  seal: { alignSelf: 'flex-start' },
});
