import { useContainer } from '@/application';
import { VerifyCodeScreen } from '@/screens/verify-code';

export default function VerifyRoute() {
  return <VerifyCodeScreen demo={useContainer().mode === 'demo'} />;
}
