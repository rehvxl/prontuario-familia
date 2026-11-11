import { useContainer } from '@/application';
import { SignInScreen } from '@/screens/sign-in';

export default function SignInRoute() {
  return <SignInScreen demo={useContainer().mode === 'demo'} />;
}
