import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { DEMO_OTP_CODE } from '@/entities/session';
import { OTP_LENGTH, useRequestEmailCode, useVerifyEmailCode } from '@/features/auth';
import { Banner, Button, Chip, OtpInput, Screen, Text, errorMessage, useTheme } from '@/shared/ui';

export const RESEND_SECONDS = 60;

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

/** Segundo passo do login: código de 6 dígitos. Ao acertar, a guarda de navegação leva ao próximo passo. */
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
      footer={
        <Button label="Confirmar código" onPress={() => submit(code)} loading={verify.isPending} disabled={code.length !== OTP_LENGTH} fullWidth />
      }
    >
      <Text variant="title1">Digite o código</Text>
      <Text color="secondary" style={{ marginTop: theme.space[2], marginBottom: theme.space[6] }}>
        {email ? `Enviamos um código de ${OTP_LENGTH} dígitos para ${email}.` : `Digite o código de ${OTP_LENGTH} dígitos que enviamos por e-mail.`}
      </Text>
      {demo ? (
        <View style={{ alignSelf: 'flex-start', marginBottom: theme.space[4] }} testID="demo-banner">
          <Chip icon="flask" label={`Modo demonstração · código ${DEMO_OTP_CODE}`} />
        </View>
      ) : null}
      <OtpInput value={code} onChange={setCode} onComplete={submit} error={codeError} disabled={verify.isPending} autoFocus testID="otp-input" />
      <View style={{ marginTop: theme.space[6], alignItems: 'center', gap: theme.space[2] }}>
        {resent ? (
          <Text variant="footnote" color="secondary">
            Enviamos um novo código.
          </Text>
        ) : null}
        {resend.error ? <Banner tone="danger" message={errorMessage(resend.error, 'Não foi possível reenviar o código.')} /> : null}
        <Button
          label={countdown.left > 0 ? `Reenviar código em ${countdown.left} s` : 'Reenviar código'}
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
