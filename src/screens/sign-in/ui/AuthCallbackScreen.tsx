import { Screen, Spinner } from '@/shared/ui';

/** Destino do redirecionamento do login com Google (`prontuariofamilia://auth/callback`). A guarda leva ao próximo passo. */
export function AuthCallbackScreen() {
  return (
    <Screen scroll={false} testID="auth-callback-screen">
      <Spinner fill label="Entrando…" />
    </Screen>
  );
}
