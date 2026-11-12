import { NewVitalScreen } from '@/screens/new-vital';
import { SheetCloseButton } from '@/shared/ui/navigation';

export default function NewVitalRoute() {
  return (
    <>
      <SheetCloseButton />
      <NewVitalScreen />
    </>
  );
}
