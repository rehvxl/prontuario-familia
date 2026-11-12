import { NewMedicationScreen } from '@/screens/new-medication';
import { SheetCloseButton } from '@/shared/ui/navigation';

export default function NewMedicationRoute() {
  return (
    <>
      <SheetCloseButton />
      <NewMedicationScreen />
    </>
  );
}
