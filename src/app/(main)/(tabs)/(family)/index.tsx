import { useContainer } from '@/application';
import { FamilyHomeScreen } from '@/screens/family-home';

export default function FamilyHomeRoute() {
  return <FamilyHomeScreen demo={useContainer().mode === 'demo'} />;
}
