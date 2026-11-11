import { Stack, useRouter } from 'expo-router';
import { NewMemberScreen } from '@/screens/manage-member';

export default function NewMemberRoute() {
  const router = useRouter();
  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="xmark" accessibilityLabel="Fechar" onPress={() => router.back()} />
      </Stack.Toolbar>
      <NewMemberScreen />
    </>
  );
}
