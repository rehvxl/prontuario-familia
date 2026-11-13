import { useContainer } from '@/application';
import { PresentEmergencyCardScreen } from '@/screens/present-emergency-card';

export default function PresentEmergencyCardRoute() {
  return <PresentEmergencyCardScreen demo={useContainer().mode === 'demo'} />;
}