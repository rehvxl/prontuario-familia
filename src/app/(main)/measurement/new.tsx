import { NewMeasurementScreen } from '@/screens/new-measurement';
import { SheetCloseButton } from '@/shared/ui/navigation';

export default function NewMeasurementRoute() {
  return (
    <>
      <SheetCloseButton />
      <NewMeasurementScreen />
    </>
  );
}
