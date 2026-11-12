import { NewVaccineDoseScreen } from '@/screens/new-vaccine-dose';
import { SheetCloseButton } from '@/shared/ui/navigation';

export default function NewVaccineDoseRoute() {
  return (
    <>
      <SheetCloseButton />
      <NewVaccineDoseScreen />
    </>
  );
}
