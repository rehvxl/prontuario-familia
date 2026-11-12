import { NewRecordScreen } from '@/screens/new-record';
import { SheetCloseButton } from '@/shared/ui/navigation';

export default function NewRecordRoute() {
  return (
    <>
      <SheetCloseButton />
      <NewRecordScreen />
    </>
  );
}
