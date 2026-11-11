import { Stack, useRouter } from 'expo-router';
import { NewRecordScreen } from '@/screens/new-record';

export default function NewRecordRoute() {
  const router = useRouter();
  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="xmark" accessibilityLabel="Fechar" onPress={() => router.back()} />
      </Stack.Toolbar>
      <NewRecordScreen />
    </>
  );
}
