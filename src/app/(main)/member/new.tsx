import { NewMemberScreen } from '@/screens/manage-member';
import { SheetCloseButton } from '@/shared/ui/navigation';

export default function NewMemberRoute() {
  return (
    <>
      <SheetCloseButton />
      <NewMemberScreen />
    </>
  );
}
