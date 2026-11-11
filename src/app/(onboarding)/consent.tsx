import { useConsentFlow } from '@/application';
import { ConsentScreen } from '@/screens/consent';

export default function ConsentRoute() {
  const flow = useConsentFlow();
  return <ConsentScreen flow={flow} />;
}
