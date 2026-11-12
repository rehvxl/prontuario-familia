import { Redirect, type Href } from 'expo-router';
import { entryRouteFor } from '@/application';
import { useCurrentUser } from '@/entities/session';
import { WelcomeScreen } from '@/screens/welcome';

/**
 * Âncora do grupo de onboarding. Quem já tem sessão e voltou ao consentimento (BUG-09: revogou) já viu as
 * boas-vindas e segue direto para o aceite; a guarda de `_layout.tsx` leva ao mesmo lugar.
 */
export default function WelcomeRoute() {
  const signedIn = useCurrentUser().data != null;
  const entry = entryRouteFor('consent', signedIn);
  if (signedIn) return <Redirect href={entry as Href} />;
  return <WelcomeScreen />;
}
