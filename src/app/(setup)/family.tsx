import { Redirect } from 'expo-router';
import { useMyFamily } from '@/entities/family';
import { CreateFamilyScreen } from '@/screens/create-family';

export default function FamilyRoute() {
  // Se a família já existe (ex.: voltou do passo seguinte), vai direto para as pessoas.
  const family = useMyFamily().data;
  if (family) return <Redirect href="/(setup)/members" />;
  return <CreateFamilyScreen />;
}
