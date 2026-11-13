import { useLocalSearchParams, useRouter } from 'expo-router';
import { EditEmergencyCardScreen } from '@/screens/edit-emergency-card';
import { backOrReplace, SheetCloseButton } from '@/shared/ui/navigation';

export default function EditEmergencyCardRoute() {
  const router = useRouter();
  const { memberId: raw } = useLocalSearchParams<{ memberId?: string }>();
  const memberId = typeof raw === 'string' ? raw : '';
  const close = () => backOrReplace(router, { pathname: '/(main)/member/[id]/emergency', params: { id: memberId } });
  return (
    <>
      <SheetCloseButton onPress={close} />
      <EditEmergencyCardScreen />
    </>
  );
}
